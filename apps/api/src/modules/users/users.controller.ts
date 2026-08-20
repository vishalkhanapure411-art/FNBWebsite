import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'List users (tenant-scoped; SUPER_ADMIN sees all)' })
  findAll(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll(req.tenantScope, { page, limit });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Create a new user (tenant-scoped)' })
  create(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(dto, req.tenantScope);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Param('id') id: string,
  ) {
    return this.usersService.findById(id, req.tenantScope);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  update(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto, req.tenantScope);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Soft-delete user (sets status=INACTIVE)' })
  remove(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Param('id') id: string,
  ) {
    return this.usersService.softDelete(id, req.tenantScope);
  }

  @Patch(':id/permissions')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update granular permission overrides for a user' })
  updatePermissions(
    @Req() req: { tenantScope: { tenantId: string | null } },
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.usersService.updatePermissions(id, dto, req.tenantScope);
  }
}
