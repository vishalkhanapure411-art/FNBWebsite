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
import { CulinaryService } from './culinary.service';
import {
  CreateMenuPlanDto,
  UpdateMenuPlanDto,
  ReplacePlanItemsDto,
  PlansQueryDto,
  CreateIndentDto,
  IndentsQueryDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

// CULINARY + management + SITE_LEAD can view; CULINARY (and SUPER_ADMIN) can write.
const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.CULINARY,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
  Role.SITE_LEAD,
];
const WRITE_ROLES = [Role.SUPER_ADMIN, Role.CULINARY];

@ApiTags('Culinary / Menu Planning')
@Controller('culinary')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class CulinaryController {
  constructor(private readonly culinaryService: CulinaryService) {}

  // ── Menu plans ──
  @Post('plans')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a menu plan (DRAFT)' })
  createPlan(@Body() dto: CreateMenuPlanDto, @Req() req: Request) {
    return this.culinaryService.createPlan(dto, (req as any).user);
  }

  @Get('plans')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List menu plans (tenant-scoped, optional status/siteId)' })
  listPlans(@Query() query: PlansQueryDto, @Req() req: Request) {
    return this.culinaryService.listPlans(query, (req as any).user);
  }

  @Get('plans/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single menu plan with items' })
  getPlan(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.getPlan(id, (req as any).user);
  }

  @Patch('plans/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update a menu plan (name/dates/notes/status)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateMenuPlanDto, @Req() req: Request) {
    return this.culinaryService.updatePlan(id, dto, (req as any).user);
  }

  @Post('plans/:id/items')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Replace all items on a menu plan (upsert semantics)' })
  replacePlanItems(@Param('id') id: string, @Body() dto: ReplacePlanItemsDto, @Req() req: Request) {
    return this.culinaryService.replacePlanItems(id, dto, (req as any).user);
  }

  @Delete('plans/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Delete a menu plan (only DRAFT or with no indents)' })
  deletePlan(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.deletePlan(id, (req as any).user);
  }

  // ── Indents ──
  @Post('indents')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Raise an indent from a menu plan (computed lines)' })
  createIndent(@Body() dto: CreateIndentDto, @Req() req: Request) {
    return this.culinaryService.createIndent(dto, (req as any).user);
  }

  @Get('indents')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List indents (tenant-scoped, optional status/siteId)' })
  listIndents(@Query() query: IndentsQueryDto, @Req() req: Request) {
    return this.culinaryService.listIndents(query, (req as any).user);
  }

  @Get('indents/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single indent with lines' })
  getIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.getIndent(id, (req as any).user);
  }

  @Post('indents/:id/submit')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Submit an indent (DRAFT → SUBMITTED)' })
  submitIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.submitIndent(id, (req as any).user);
  }

  @Post('indents/:id/approve')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Approve an indent (SUBMITTED → APPROVED)' })
  approveIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.approveIndent(id, (req as any).user);
  }

  @Post('indents/:id/issue')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Issue an indent (APPROVED → ISSUED)' })
  issueIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.issueIndent(id, (req as any).user);
  }

  @Post('indents/:id/cancel')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cancel an indent (DRAFT/SUBMITTED → CANCELLED)' })
  cancelIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.cancelIndent(id, (req as any).user);
  }

  @Delete('indents/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Delete a draft indent (cleanup)' })
  deleteIndent(@Param('id') id: string, @Req() req: Request) {
    return this.culinaryService.deleteIndent(id, (req as any).user);
  }
}