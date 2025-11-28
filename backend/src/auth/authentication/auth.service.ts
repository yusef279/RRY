import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee-profile/models/employee-system-role.schema';
import { AuthUser } from '../authorization/interfaces/auth-user.interface';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(EmployeeProfile.name) private empModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name) private roleModel: Model<EmployeeSystemRoleDocument>,
    private jwt: JwtService,
  ) {}

  /* ----------  REGISTER  ---------- */
  async register(dto: RegisterDto) {
    const { email, password, role, firstName, lastName, employeeId, departmentId } = dto;
    const existing = await this.empModel.findOne({ workEmail: email });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(password, 12);
    const user = await this.empModel.create({
      workEmail: email,
      'userProfile.firstName': firstName,
      'userProfile.lastName': lastName,
      'userProfile.password': hashed,
      departmentId,
      accessProfileId: role,
    });
    return this.buildTokens(user, role); // 1️⃣ added role
  }

  /* ----------  LOGIN  ---------- */
  async login(dto: LoginDto) {
    const { nationalId, password } = dto;
    const emp = await this.empModel.findOne({ 'userProfile.nationalId': nationalId }).lean();
    if (!emp) throw new UnauthorizedException('Invalid credentials');

    const hash = (emp as any).userProfile?.password; // 2️⃣ cast
    if (!hash) throw new UnauthorizedException('Password not set');

    const match = await bcrypt.compare(password, hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const roleDoc = await this.roleModel.findById(emp.accessProfileId).lean();
    if (!roleDoc) throw new UnauthorizedException('Role not found');

    const roleName = (roleDoc as any).name; // 3️⃣ cast
    return this.buildTokens(emp, roleName); // 1️⃣ added roleName
  }

  /* ----------  LOGOUT  ---------- */
  async logout(userId: string) {
    return { message: 'Logged out' };
  }

  /* ----------  HELPER  ---------- */
  private buildTokens(emp: any, roleName: string) {
    const payload: AuthUser = {
      userId: emp._id.toString(),
      email: emp.workEmail,
      role: roleName as any,
      employeeId: emp._id.toString(),
      departmentId: emp.departmentId?.toString(),
    };
    return { access_token: this.jwt.sign(payload), user: payload };
  }
}