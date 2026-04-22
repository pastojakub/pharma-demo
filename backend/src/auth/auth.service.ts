import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, org: user.org };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
      org: user.org,
    };
  }

  async register(email: string, pass: string, role: string, org: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        org,
      },
    });
  }
}
