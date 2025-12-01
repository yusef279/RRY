import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';

import { AuthUser } from './auth-user.interface';
import { RegisterDto, LoginDto } from './auth.dto';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

@Injectable()
export class AuthService {
  private blacklistedTokens = new Set<string>();

  constructor(
    @InjectModel(EmployeeProfile.name) private empModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name) private roleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    private jwt: JwtService,
  ) {}

  /* ----------  REGISTER  ---------- */
  async register(dto: RegisterDto): Promise<any> {
    const email: string = dto.email;
    const password: string = dto.password;
    const role: SystemRole = dto.role;
    const firstName: string = dto.firstName;
    const lastName: string = dto.lastName;
    const nationalId: string = dto.nationalId;
    const employeeNumber: string = dto.employeeNumber;
    const dateOfHire: string = dto.dateOfHire;
    const departmentId: string | undefined = dto.departmentId;

const missingFields = [
  !email && 'email',
  !password && 'password',
  !firstName && 'firstName',
  !lastName && 'lastName',
  !nationalId && 'nationalId',
  !employeeNumber && 'employeeNumber',
  !dateOfHire && 'dateOfHire',
  !role && 'role',
].filter(Boolean) as string[];

if (missingFields.length > 0) {
  throw new BadRequestException(
    `Missing required fields: ${missingFields.join(', ')}`,
  );
}

    // ✅ Validate field formats before DB queries
    if (!email.includes('@') || email.length < 5) {
      throw new BadRequestException('Invalid email format');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    if (nationalId.length < 10) {
      throw new BadRequestException('Invalid national ID format');
    }


    // ✅ Now check uniqueness (DB operations)
    if (await this.empModel.findOne({ workEmail: email }))
      throw new ConflictException('Email already registered');
    
    if (await this.empModel.findOne({ nationalId }))
      throw new ConflictException('National ID already registered');
    
    if (await this.empModel.findOne({ employeeNumber }))
      throw new ConflictException('Employee number already exists');


    // ✅ Validate department if provided
    let deptOid: string | undefined;
    if (departmentId) {
      const dept = await this.deptModel.findOne({ code: departmentId }).exec();
      if (!dept) throw new BadRequestException(`Department with code "${departmentId}" not found`);
      deptOid = dept._id.toString();
    }

    try {
      // ✅ Only create employee after ALL validations pass
      const hashed = await bcrypt.hash(password, 12);
      const user = await this.empModel.create({
        workEmail: email,
        firstName,
        lastName,
        nationalId,
        password: hashed,
        employeeNumber,
        dateOfHire: new Date(dateOfHire),
        primaryDepartmentId: deptOid,
      });

      // ✅ Create role doc with real employeeProfileId
      const roleDoc = await this.roleModel.create({
        employeeProfileId: user._id,
        roles: [role],
        permissions: [],
        isActive: true,
      });

      // ✅ Link role to employee
      user.accessProfileId = roleDoc._id;
      await user.save();

      return this.buildTokens(user);
    } catch (error) {
      // ✅ If DB creation fails, throw descriptive error
      console.error('❌ Registration failed:', error.message);
      throw new BadRequestException(
        `Registration failed: ${error.message}`,
      );
    }
  }

  /* ----------  LOGIN  ---------- */
  async login(dto: LoginDto): Promise<any> {
    const email: string = dto.email;
    const password: string = dto.password;

    // ✅ Validate input
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }


    try {
      const emp = await this.empModel.findOne({ workEmail: email });
      
      // ✅ Generic error message for security
      if (!emp) {
        console.warn('❌ Login failed: User not found -', email);
        throw new UnauthorizedException('Invalid email or password');
      }

      const hash = emp.password;
      if (!hash) {
        console.warn('Login failed: No password set for user -', email);
        throw new UnauthorizedException('Password not set – contact admin');
      }

      const ok = await bcrypt.compare(password, hash);
      if (!ok) {
        console.warn('Login failed: Invalid password for user -', email);
        throw new UnauthorizedException('Invalid email or password');
      }

      console.log(' Login successful:', email);
      return this.buildTokens(emp);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error(' Login error:', error.message);
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  /* ----------  LOGOUT  ---------- */
  async logout(userId: string, token: string) {
    // ✅ Validate input
    if (!userId || !token) {
      throw new BadRequestException('User ID and token are required');
    }

    try {
      // ✅ Verify user exists
      const user = await this.empModel.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // ✅ Add token to blacklist (prevents reuse)
      this.blacklistedTokens.add(token);


      return {
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Logout error:', error.message);
      throw new BadRequestException('Logout failed. Please try again.');
    }
  }

  /* ----------  CHECK IF TOKEN IS BLACKLISTED  ---------- */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  /* ----------  TOKEN BUILDER  ---------- */
  private async buildTokens(emp: any) {
    try {
      // fallback: try accessProfileId first, then search by employeeProfileId
      let roleDoc = await this.roleModel.findById(emp.accessProfileId).lean().exec();
      if (!roleDoc)
        roleDoc = await this.roleModel.findOne({ employeeProfileId: emp._id }).lean().exec();

      if (!roleDoc || !roleDoc.roles?.length) throw new Error('Role not found for user');

      const payload: AuthUser = {
        userId: emp._id.toString(),
        email: emp.workEmail,
        role: roleDoc.roles[0],
        employeeId: emp._id.toString(),
        departmentId: emp.primaryDepartmentId?.toString(),
      };

      const accessToken = this.jwt.sign(payload);
      
      return { access_token: accessToken, user: payload };
    } catch (error) {
      console.error('❌ Token generation error:', error.message);
      throw new UnauthorizedException('Failed to generate authentication token');
    }
  }
}