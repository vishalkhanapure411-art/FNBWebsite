import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto, SiteStatusDto, QuerySitesDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Sites')
@Controller('sites')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List sites with pagination, filtering, and role-based scoping' })
  findAll(@Query() query: QuerySitesDto, @Req() req: Request) {
    return this.sitesService.findAll(query, req.user as any);
  }

  @Get('export')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Export sites as CSV' })
  async export(@Res() res: Response, @Req() req: Request) {
    const csv = await this.sitesService.exportCsv(req.user as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sites-export.csv"');
    res.send(csv);
  }

  @Post('bulk-onboard')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Bulk onboard sites from CSV upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkOnboard(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    return this.sitesService.bulkOnboard(file);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get site details with tenant info' })
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.sitesService.findById(id, req.user as any);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a new site (status starts as DRAFT)' })
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update site details, config, banking' })
  update(@Param('id') id: string, @Body() dto: UpdateSiteDto, @Req() req: Request) {
    return this.sitesService.update(id, dto, req.user as any);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Status transition with automatic go-live date' })
  updateStatus(@Param('id') id: string, @Body() dto: SiteStatusDto, @Req() req: Request) {
    return this.sitesService.updateStatus(id, dto, req.user as any);
  }

  @Get(':id/dashboard')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Site live dashboard with aggregated stats' })
  getDashboard(@Param('id') id: string, @Req() req: Request) {
    return this.sitesService.getDashboard(id, req.user as any);
  }
}
