import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee-profile/models/employee-system-role.schema';
import { Department, DepartmentDocument } from '../../organization-structure/models/department.schema';
import { AuthUser } from '../authorization/interfaces/auth-user.interface';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(EmployeeProfile.name) private empModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name) private roleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    private jwt: JwtService,
  ) {}

  /* ----------  REGISTER  ---------- */
  async register(dto: RegisterDto) {
    let { email, password, role, firstName, lastName, nationalId, employeeNumber, dateOfHire, departmentId } = dto;
    
    if (!email || !password || !firstName || !lastName || !nationalId || !employeeNumber || !dateOfHire) {
      throw new BadRequestException('All fields are required');
    }

    // Check if email already exists
    const existingEmail = await this.empModel.findOne({ workEmail: email });
    if (existingEmail) throw new ConflictException('Email already registered');

    // Check if national ID already exists
    const existingNationalId = await this.empModel.findOne({ nationalId });
    if (existingNationalId) throw new ConflictException('National ID already registered');

    // Check if employee number already exists
    const existingEmployeeNumber = await this.empModel.findOne({ employeeNumber });
    if (existingEmployeeNumber) throw new ConflictException('Employee number already exists');

    // Get the role by name to get the ObjectId
    const roleDoc = await this.roleModel.findOne({ name: role }) as any;
    if (!roleDoc) {
      throw new BadRequestException(`Role "${role}" not found in system`);
    }

    // Validate department exists (if provided)
    if (departmentId) {
      const dept = await this.deptModel.findOne({ code: departmentId }).exec();
      if (!dept) {
        throw new BadRequestException(`Department with code "${departmentId}" not found`);
      }
      departmentId = dept._id.toString();
    }

    const hashed = await bcrypt.hash(password, 12);
    
    const user = await this.empModel.create({
      workEmail: email,
      firstName,
      lastName,
      nationalId,
      password: hashed,
      employeeNumber,
      dateOfHire: new Date(dateOfHire),
      primaryDepartmentId: departmentId,
      accessProfileId: roleDoc._id,
    });

    console.log('✅ User registered successfully:', { 
      email: user.workEmail,
      nationalId: user.nationalId,
      hasPassword: !!user.password,
      role: roleDoc.name,
    });

    return this.buildTokens(user, roleDoc.name);
  }

  /* ----------  LOGIN WITH EMAIL  ---------- */
  async login(dto: LoginDto) {
    const { email, password } = dto;
    
    console.log('🔐 Attempting login with email:', email);

    const emp = await this.empModel.findOne({ workEmail: email });

    if (!emp) {
      console.log('❌ User not found with email:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    const hash = emp.password;

    console.log('🔍 Checking password:', {
      email,
      hasPassword: !!hash,
    });

    if (!hash) {
      console.log('❌ Password not found for user:', email);
      throw new UnauthorizedException('Password not set - please contact administrator');
    }

    const match = await bcrypt.compare(password, hash);
    if (!match) {
      console.log('❌ Password mismatch for user:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    const roleDoc = await this.roleModel.findById(emp.accessProfileId) as any;
    if (!roleDoc) {
      console.log('❌ Role not found for user:', email);
      throw new UnauthorizedException('Role not found');
    }

    const roleName = roleDoc.name;
    console.log('✅ Login successful for email:', email, 'with role:', roleName);
    
    return this.buildTokens(emp, roleName);
  }

  /* ----------  LOGOUT  ---------- */
  async logout(userId: string) {
    return { message: 'Logged out successfully' };
  }

  /* ----------  HELPER  ---------- */
  private buildTokens(emp: any, roleName: string) {
    const payload: AuthUser = {
      userId: emp._id.toString(),
      email: emp.workEmail,
      role: roleName as any,
      employeeId: emp._id.toString(),
      departmentId: emp.primaryDepartmentId?.toString(),
    };
    return { 
      access_token: this.jwt.sign(payload), 
      user: payload 
    };
  }
}