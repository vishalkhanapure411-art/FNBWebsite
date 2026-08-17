import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Permission } from '@omniops/shared';

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: Role;
  permissions: Permission[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    return {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as Role,
      permissions: (user.permissions as Record<string, boolean>) ?? {},
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      siteId: user.siteId,
      status: user.status,
    };
  }
}
