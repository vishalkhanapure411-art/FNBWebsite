import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';
import { Role, UserStatus } from '@omniops/shared';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantScope: { tenantId: string | null }, query: { page?: number; limit?: number }) {
    // ValidationPipe with enableImplicitConversion turns an ABSENT query param into
    // NaN (not undefined), so `?? fallback` is not enough — sanitize explicitly.
    const page =
      Number.isFinite(Number(query.page)) && Number(query.page) > 0
        ? Math.floor(Number(query.page))
        : 1;
    const limit =
      Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
        ? Math.min(Math.floor(Number(query.limit)), 100)
        : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (tenantScope.tenantId) {
      where.tenantId = tenantScope.tenantId;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          tenantId: true,
          siteId: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, tenantScope: { tenantId: string | null }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        status: true,
        tenantId: true,
        siteId: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Tenant isolation: non-SUPER_ADMIN can only see their own tenant's users
    if (tenantScope.tenantId && user.tenantId !== tenantScope.tenantId) {
      throw new NotFoundException('User not found');
    }

    return { data: user };
  }

  async create(dto: CreateUserDto, tenantScope: { tenantId: string | null }) {
    // Check uniqueness within tenant
    const emailKey = tenantScope.tenantId
      ? `${tenantScope.tenantId}:${dto.email}`
      : dto.email;

    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId: tenantScope.tenantId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? Role.FOH,
        tenantId: tenantScope.tenantId,
        siteId: dto.siteId,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        siteId: true,
        phone: true,
        createdAt: true,
      },
    });

    return { data: user };
  }

  async update(id: string, dto: UpdateUserDto, tenantScope: { tenantId: string | null }) {
    const user = await this.findById(id, tenantScope);

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          tenantId: tenantScope.tenantId ?? null,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.role && { role: dto.role }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status && { status: dto.status }),
        ...(dto.siteId !== undefined && { siteId: dto.siteId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        siteId: true,
        phone: true,
        updatedAt: true,
      },
    });

    return { data: updated };
  }

  async softDelete(id: string, tenantScope: { tenantId: string | null }) {
    await this.findById(id, tenantScope);

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    return { data: { id, status: UserStatus.INACTIVE } };
  }

  async updatePermissions(
    id: string,
    dto: UpdatePermissionsDto,
    tenantScope: { tenantId: string | null },
  ) {
    await this.findById(id, tenantScope);

    const permissions = dto.all === true ? { all: true } : dto.permissions;

    const updated = await this.prisma.user.update({
      where: { id },
      data: { permissions },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        permissions: true,
      },
    });

    return { data: updated };
  }
}
