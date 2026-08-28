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
import { ControlsService } from './controls.service';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  CreateRecipeDto,
  UpdateRecipeDto,
  CreateClosingPeriodDto,
  CogsQueryDto,
  ClosingsQueryDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

// CONTROLS + management + SITE_LEAD can view; CONTROLS (and SUPER_ADMIN) can write.
const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.CONTROLS,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
  Role.SITE_LEAD,
];
const WRITE_ROLES = [Role.SUPER_ADMIN, Role.CONTROLS];

@ApiTags('Controls / Product Management')
@Controller('controls')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  // ── Ingredients ──
  @Post('ingredients')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create an ingredient' })
  createIngredient(@Body() dto: CreateIngredientDto, @Req() req: Request) {
    return this.controlsService.createIngredient(dto, (req as any).user);
  }

  @Get('ingredients')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List ingredients (tenant-scoped)' })
  listIngredients(@Query('active') active: string, @Req() req: Request) {
    return this.controlsService.listIngredients((req as any).user, active);
  }

  @Get('ingredients/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single ingredient' })
  getIngredient(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.getIngredient(id, (req as any).user);
  }

  @Patch('ingredients/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update an ingredient' })
  updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto, @Req() req: Request) {
    return this.controlsService.updateIngredient(id, dto, (req as any).user);
  }

  @Delete('ingredients/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Delete an ingredient (fails if referenced by recipes)' })
  deleteIngredient(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.deleteIngredient(id, (req as any).user);
  }

  // ── Recipes ──
  @Post('recipes')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a recipe (BOM) — costPerServe computed server-side' })
  createRecipe(@Body() dto: CreateRecipeDto, @Req() req: Request) {
    return this.controlsService.createRecipe(dto, (req as any).user);
  }

  @Get('recipes')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List recipes (tenant-scoped)' })
  listRecipes(@Query('active') active: string, @Req() req: Request) {
    return this.controlsService.listRecipes((req as any).user, active);
  }

  @Get('recipes/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single recipe with lines' })
  getRecipe(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.getRecipe(id, (req as any).user);
  }

  @Get('recipes/:id/versions')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Version history for a recipe (by menuItem)' })
  listRecipeVersions(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.listRecipeVersions(id, (req as any).user);
  }

  @Patch('recipes/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update a recipe — creates a new version, recomputes costPerServe' })
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto, @Req() req: Request) {
    return this.controlsService.updateRecipe(id, dto, (req as any).user);
  }

  // ── COGS report ──
  @Get('cogs')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'COGS report by site + date range (per-item cost, totals, margins)' })
  getCogs(@Query() query: CogsQueryDto, @Req() req: Request) {
    return this.controlsService.getCogs(query, (req as any).user);
  }

  // ── Month closings ──
  @Get('closings')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List closing periods' })
  listClosings(@Query() query: ClosingsQueryDto, @Req() req: Request) {
    return this.controlsService.listClosings(query, (req as any).user);
  }

  @Post('closings')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a closing period (OPEN)' })
  createClosing(@Body() dto: CreateClosingPeriodDto, @Req() req: Request) {
    return this.controlsService.createClosingPeriod(dto, (req as any).user);
  }

  @Get('closings/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a closing period' })
  getClosing(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.getClosingPeriod(id, (req as any).user);
  }

  @Post('closings/:id/close')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Close (LOCK) a period — computes revenue/COGS/margin from orders, rejects reopen' })
  closeClosing(@Param('id') id: string, @Req() req: Request) {
    return this.controlsService.closeClosingPeriod(id, (req as any).user);
  }
}
