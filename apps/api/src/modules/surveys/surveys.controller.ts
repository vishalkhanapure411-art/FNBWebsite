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
import { SurveysService } from './surveys.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateQuestionDto,
  CreateSurveyDto,
  SubmitResponseDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

const SURVEY_MANAGER_ROLES = [Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.MARKETING_ADMIN];
const SURVEY_VIEWER_ROLES = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
  Role.MARKETING_ADMIN,
  Role.SITE_LEAD,
];

@ApiTags('Surveys')
@Controller('surveys')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // ══════════════════════════════════════════════════
  // TEMPLATES
  // ══════════════════════════════════════════════════

  @Get('templates')
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'List survey templates' })
  listTemplates(@Req() req: Request) {
    return this.surveysService.listTemplates((req as any).user);
  }

  @Get('templates/:id')
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'Get template with questions and options' })
  getTemplate(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.getTemplate(id, (req as any).user);
  }

  @Post('templates')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Create survey template with questions' })
  createTemplate(@Body() dto: CreateTemplateDto, @Req() req: Request) {
    return this.surveysService.createTemplate(dto, (req as any).user);
  }

  @Patch('templates/:id')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Update survey template' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: Request,
  ) {
    return this.surveysService.updateTemplate(id, dto, (req as any).user);
  }

  @Delete('templates/:id')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Archive a survey template' })
  deleteTemplate(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.deleteTemplate(id, (req as any).user);
  }

  // ══════════════════════════════════════════════════
  // QUESTIONS
  // ══════════════════════════════════════════════════

  @Post('templates/:templateId/questions')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Add question to template' })
  addQuestion(
    @Param('templateId') templateId: string,
    @Body()
    dto: {
      type: string;
      prompt: string;
      required?: boolean;
      order?: number;
      options?: { label: string; value: string; order?: number }[];
    },
    @Req() req: Request,
  ) {
    return this.surveysService.addQuestion(templateId, dto, (req as any).user);
  }

  @Patch('questions/:id')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Update question' })
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Req() req: Request,
  ) {
    return this.surveysService.updateQuestion(id, dto, (req as any).user);
  }

  @Delete('questions/:id')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Delete question' })
  deleteQuestion(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.deleteQuestion(id, (req as any).user);
  }

  // ══════════════════════════════════════════════════
  // SURVEYS
  // ══════════════════════════════════════════════════

  @Post()
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Create survey from template' })
  createSurvey(@Body() dto: CreateSurveyDto, @Req() req: Request) {
    return this.surveysService.createSurvey(dto, (req as any).user);
  }

  @Get()
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'List surveys' })
  listSurveys(
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.surveysService.listSurveys((req as any).user, {
      siteId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'Get survey detail' })
  getSurvey(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.getSurvey(id, (req as any).user);
  }

  @Post(':id/publish')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Publish survey' })
  publishSurvey(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.publishSurvey(id, (req as any).user);
  }

  @Post(':id/close')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Close survey' })
  closeSurvey(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.closeSurvey(id, (req as any).user);
  }

  @Delete(':id')
  @Roles(...SURVEY_MANAGER_ROLES)
  @ApiOperation({ summary: 'Delete survey' })
  deleteSurvey(@Param('id') id: string, @Req() req: Request) {
    return this.surveysService.deleteSurvey(id, (req as any).user);
  }

  // ══════════════════════════════════════════════════
  // RESPONSES (AUTH)
  // ══════════════════════════════════════════════════

  @Get(':surveyId/responses')
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'List responses for a survey' })
  listResponses(
    @Param('surveyId') surveyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.surveysService.listResponses(surveyId, (req as any).user, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':surveyId/analytics')
  @Roles(...SURVEY_VIEWER_ROLES)
  @ApiOperation({ summary: 'Get survey analytics (NPS, CSAT, distributions)' })
  getAnalytics(@Param('surveyId') surveyId: string, @Req() req: Request) {
    return this.surveysService.getAnalytics(surveyId, (req as any).user);
  }

  // ══════════════════════════════════════════════════
  // PUBLIC (NO AUTH)
  // ══════════════════════════════════════════════════

  @Public()
  @Get('public/:publicSlug')
  @ApiOperation({ summary: 'Get public survey (no auth)' })
  getPublicSurvey(@Param('publicSlug') publicSlug: string) {
    return this.surveysService.getPublicSurvey(publicSlug);
  }

  @Public()
  @Post('public/:publicSlug/responses')
  @ApiOperation({ summary: 'Submit survey response (no auth)' })
  submitResponse(
    @Param('publicSlug') publicSlug: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.surveysService.submitResponse(publicSlug, dto);
  }
}
