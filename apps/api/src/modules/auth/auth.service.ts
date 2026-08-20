import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { Role, Permission, UserStatus } from '@omniops/shared';

const BCRYPT_ROUNDS = 10;

// Default permissions by role — these are overridable per-user via permissions JSON column
const DEFAULT_PERMISSIONS: Record<Role, Record<string, boolean>> = {
  [Role.SUPER_ADMIN]: { all: true },
  [Role.FRANCHISE_OWNER]: { all: true },
  [Role.BRAND_MANAGER]: {
    TENANT_READ: true,
    TENANT_UPDATE: true,
    SITE_CREATE: true,
    SITE_READ: true,
    SITE_UPDATE: true,
    SITE_DELETE: true,
    USER_CREATE: true,
    USER_READ: true,
    USER_UPDATE: true,
    USER_DELETE: true,
    MENU_CREATE: true,
    MENU_READ: true,
    MENU_UPDATE: true,
    MENU_DELETE: true,
    ORDER_READ: true,
    STAFF_MANAGE: true,
    STAFF_SCHEDULE: true,
    QUALITY_VIEW: true,
    SURVEY_VIEW: true,
  },
  [Role.OPERATIONS_MANAGER]: {
    TENANT_READ: true,
    TENANT_UPDATE: true,
    SITE_CREATE: true,
    SITE_READ: true,
    SITE_UPDATE: true,
    SITE_DELETE: true,
    USER_CREATE: true,
    USER_READ: true,
    USER_UPDATE: true,
    USER_DELETE: true,
    MENU_CREATE: true,
    MENU_READ: true,
    MENU_UPDATE: true,
    MENU_DELETE: true,
    ORDER_READ: true,
    STAFF_MANAGE: true,
    STAFF_SCHEDULE: true,
    QUALITY_VIEW: true,
    SURVEY_VIEW: true,
  },
  [Role.FINANCE_MANAGER]: {
    TENANT_READ: true,
    TENANT_UPDATE: true,
    SITE_CREATE: true,
    SITE_READ: true,
    SITE_UPDATE: true,
    SITE_DELETE: true,
    USER_CREATE: true,
    USER_READ: true,
    USER_UPDATE: true,
    USER_DELETE: true,
    MENU_CREATE: true,
    MENU_READ: true,
    MENU_UPDATE: true,
    MENU_DELETE: true,
    ORDER_READ: true,
    STAFF_MANAGE: true,
    STAFF_SCHEDULE: true,
    QUALITY_VIEW: true,
    SURVEY_VIEW: true,
  },
  [Role.REVENUE_ASSURANCE]: {
    SITE_READ: true,
    ORDER_READ: true,
    QUALITY_VIEW: true,
    SURVEY_VIEW: true,
  },
  [Role.SITE_LEAD]: {
    SITE_READ: true,
    SITE_UPDATE: true,
    USER_CREATE: true,
    USER_READ: true,
    USER_UPDATE: true,
    MENU_READ: true,
    MENU_UPDATE: true,
    ORDER_CREATE: true,
    ORDER_READ: true,
    ORDER_UPDATE: true,
    STAFF_MANAGE: true,
    STAFF_SCHEDULE: true,
    MAINTENANCE_MANAGE: true,
    QUALITY_AUDIT: true,
    SIGNAGE_MANAGE: true,
    SURVEY_VIEW: true,
  },
  [Role.KITCHEN_STAFF]: {
    ORDER_READ: true,
    ORDER_UPDATE: true,
    MENU_READ: true,
    SITE_READ: true,
  },
  [Role.FOH]: {
    ORDER_CREATE: true,
    ORDER_READ: true,
    ORDER_UPDATE: true,
    MENU_READ: true,
    SITE_READ: true,
    USER_READ: true,
  },
  [Role.MAINTENANCE_TECH]: {
    MAINTENANCE_MANAGE: true,
    MAINTENANCE_VIEW: true,
    SITE_READ: true,
  },
  [Role.QUALITY_AUDITOR]: {
    QUALITY_AUDIT: true,
    QUALITY_VIEW: true,
    SITE_READ: true,
  },
  [Role.HR_ADMIN]: {
    USER_CREATE: true,
    USER_READ: true,
    USER_UPDATE: true,
    USER_DELETE: true,
    STAFF_MANAGE: true,
    STAFF_SCHEDULE: true,
    SITE_READ: true,
  },
  [Role.MARKETING_ADMIN]: {
    SIGNAGE_MANAGE: true,
    SIGNAGE_VIEW: true,
    SURVEY_CREATE: true,
    SURVEY_VIEW: true,
    MENU_READ: true,
    SITE_READ: true,
  },
  [Role.CUSTOMER]: {
    MENU_READ: true,
    ORDER_CREATE: true,
    ORDER_READ: true,
  },
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active. Please contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions ?? this.getDefaultPermissions(user.role as Role),
    };

    const expiresIn = dto.rememberMe ? '30d' : '24h';
    const accessToken = this.jwtService.sign(tokenPayload, { expiresIn });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '90d' },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions ?? this.getDefaultPermissions(user.role as Role),
        tenantId: user.tenantId,
        siteId: user.siteId,
        status: user.status,
      },
    };
  }

  async register(dto: RegisterDto, currentUser?: { role: Role }) {
    // Check if email already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Only SUPER_ADMIN can set tenantId/role explicitly
    let role: Role = Role.CUSTOMER;
    let tenantId: string | null = null;

    if (currentUser?.role === Role.SUPER_ADMIN) {
      role = dto.role ?? Role.CUSTOMER;
      tenantId = dto.tenantId ?? null;
    } else if (dto.role || dto.tenantId) {
      throw new BadRequestException('Only super admins can set role or tenantId');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const defaultPermissions = this.getDefaultPermissions(role);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role,
        tenantId,
        permissions: defaultPermissions,
        status: UserStatus.ACTIVE,
      },
    });

    const tokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: defaultPermissions,
    };

    const accessToken = this.jwtService.sign(tokenPayload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '90d' },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: defaultPermissions,
        tenantId: user.tenantId,
        siteId: user.siteId,
        status: user.status,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokenPayload = {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        permissions: user.permissions ?? this.getDefaultPermissions(user.role as Role),
      };

      const newAccessToken = this.jwtService.sign(tokenPayload, { expiresIn: '24h' });

      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions ?? this.getDefaultPermissions(user.role as Role),
          tenantId: user.tenantId,
          siteId: user.siteId,
          status: user.status,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions ?? this.getDefaultPermissions(user.role as Role),
      tenantId: user.tenantId,
      siteId: user.siteId,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  getDefaultPermissions(role: Role): Record<string, boolean> {
    return (DEFAULT_PERMISSIONS[role] as Record<string, boolean>) ?? {};
  }
}
