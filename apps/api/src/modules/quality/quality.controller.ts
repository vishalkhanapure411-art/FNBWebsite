import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { QualityService } from './quality.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateItemDto,
  UpdateItemDto,
  StartAuditDto,
  RespondDto,
  AuditStatusDto,
  CreateCapaDto,
  UpdateCapaDto,
  ResolveCapaDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

const AUDITOR_ROLES = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
  Role.SITE_LEAD,
  Role.QUALITY_AUDITOR,
];
const TEMPLATE_EDITOR_ROLES = [Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.QUALITY_AUDITOR];

@ApiTags('Quality')
@Controller('quality')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  // ─── TEMPLATES ───
  @Get('templates')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'List audit templates' })
  listTemplates(@Req() req: Request) {
    return this.qualityService.listTemplates((req as any).user);
  }

  @Get('templates/:id')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Get template with sections and items' })
  getTemplate(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.getTemplate(id, (req as any).user);
  }

  @Post('templates')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Create audit template' })
  createTemplate(@Body() dto: CreateTemplateDto, @Req() req: Request) {
    return this.qualityService.createTemplate(dto, (req as any).user);
  }

  @Patch('templates/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Update audit template' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Req() req: Request) {
    return this.qualityService.updateTemplate(id, dto, (req as any).user);
  }

  @Delete('templates/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Soft-delete audit template' })
  deleteTemplate(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.deleteTemplate(id, (req as any).user);
  }

  // ─── SECTIONS ───
  @Post('templates/:templateId/sections')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Add section to template' })
  addSection(
    @Param('templateId') templateId: string,
    @Body() dto: CreateSectionDto,
    @Req() req: Request,
  ) {
    return this.qualityService.addSection(templateId, dto, (req as any).user);
  }

  @Patch('sections/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Update section' })
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto, @Req() req: Request) {
    return this.qualityService.updateSection(id, dto, (req as any).user);
  }

  @Delete('sections/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Delete section (cascades items)' })
  deleteSection(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.deleteSection(id, (req as any).user);
  }

  // ─── ITEMS ───
  @Post('sections/:sectionId/items')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Add item to section' })
  addItem(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateItemDto,
    @Req() req: Request,
  ) {
    return this.qualityService.addItem(sectionId, dto, (req as any).user);
  }

  @Patch('items/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Update item' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto, @Req() req: Request) {
    return this.qualityService.updateItem(id, dto, (req as any).user);
  }

  @Delete('items/:id')
  @Roles(...TEMPLATE_EDITOR_ROLES)
  @ApiOperation({ summary: 'Delete item' })
  deleteItem(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.deleteItem(id, (req as any).user);
  }

  // ─── AUDITS ───
  @Post('audits')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Start a new audit from a template' })
  startAudit(@Body() dto: StartAuditDto, @Req() req: Request) {
    return this.qualityService.startAudit(dto, (req as any).user);
  }

  @Get('audits')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'List audits' })
  listAudits(
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.qualityService.listAudits((req as any).user, {
      siteId,
      status,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('audits/:id')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Get audit detail with responses and CAPAs' })
  getAudit(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.getAudit(id, (req as any).user);
  }

  @Patch('audits/:id/respond')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Submit response for an audit item' })
  respond(@Param('id') id: string, @Body() dto: RespondDto, @Req() req: Request) {
    return this.qualityService.respond(id, dto, (req as any).user);
  }

  @Post('audits/:id/complete')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Complete audit and calculate score' })
  complete(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.complete(id, (req as any).user);
  }

  @Patch('audits/:id/status')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Transition audit status to REVIEWED or CLOSED' })
  updateStatus(@Param('id') id: string, @Body() dto: AuditStatusDto, @Req() req: Request) {
    return this.qualityService.updateStatus(id, dto, (req as any).user);
  }

  // ─── CAPA ───
  @Post('audits/:auditId/capas')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Create CAPA for an audit' })
  createCapa(
    @Param('auditId') auditId: string,
    @Body() dto: CreateCapaDto,
    @Req() req: Request,
  ) {
    return this.qualityService.createCapa(auditId, dto, (req as any).user);
  }

  @Get('capas')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'List CAPAs' })
  listCapas(
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('siteId') siteId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.qualityService.listCapas((req as any).user, {
      status,
      assignedToId,
      siteId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Patch('capas/:id')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Update CAPA' })
  updateCapa(@Param('id') id: string, @Body() dto: UpdateCapaDto, @Req() req: Request) {
    return this.qualityService.updateCapa(id, dto, (req as any).user);
  }

  @Patch('capas/:id/resolve')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Resolve CAPA' })
  resolveCapa(@Param('id') id: string, @Body() dto: ResolveCapaDto, @Req() req: Request) {
    return this.qualityService.resolveCapa(id, dto, (req as any).user);
  }

  @Patch('capas/:id/verify')
  @Roles(...AUDITOR_ROLES)
  @ApiOperation({ summary: 'Verify resolved CAPA' })
  verifyCapa(@Param('id') id: string, @Req() req: Request) {
    return this.qualityService.verifyCapa(id, (req as any).user);
  }
}
