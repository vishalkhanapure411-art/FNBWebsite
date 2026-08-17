import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, SurveyTemplateStatus, SurveyStatus, SurveyQuestionType } from '@omniops/shared';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateQuestionDto,
  CreateSurveyDto,
  SubmitResponseDto,
} from './dto';

type UserCtx = { tenantId: string | null; role: Role; sub?: string; email?: string };

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  private tenantWhere(user: UserCtx): Record<string, unknown> {
    return user.role === Role.SUPER_ADMIN ? {} : { tenantId: user.tenantId! };
  }

  // ══════════════════════════════════════════════
  // TEMPLATES
  // ══════════════════════════════════════════════

  async listTemplates(user: UserCtx) {
    const templates = await this.prisma.surveyTemplate.findMany({
      where: this.tenantWhere(user),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true, surveys: true } },
      },
    });
    return {
      success: true,
      data: templates.map((t) => ({
        ...t,
        questionCount: t._count.questions,
        surveyCount: t._count.surveys,
        _count: undefined,
      })),
    };
  }

  async getTemplate(id: string, user: UserCtx) {
    const template = await this.prisma.surveyTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    return { success: true, data: template };
  }

  async createTemplate(dto: CreateTemplateDto, user: UserCtx) {
    let tenantId = user.tenantId;
    if (!tenantId && user.role === Role.SUPER_ADMIN) {
      // Fallback: use the first tenant in the system
      const firstTenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!firstTenant) throw new BadRequestException('No tenants exist yet');
      tenantId = firstTenant.id;
    }
    if (!tenantId) {
      throw new BadRequestException('User must belong to a tenant');
    }
    const template = await this.prisma.surveyTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        status: SurveyTemplateStatus.DRAFT,
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, qi) => ({
                type: q.type as SurveyQuestionType,
                prompt: q.prompt,
                required: q.required ?? true,
                order: q.order ?? qi,
                options: q.options?.length
                  ? {
                      create: q.options.map((o, oi) => ({
                        label: o.label,
                        value: o.value,
                        order: o.order ?? oi,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: { questions: { include: { options: true } } },
    });
    return { success: true, data: template };
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, user: UserCtx) {
    const template = await this.prisma.surveyTemplate.findUnique({ where: { id } });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.status) data.status = dto.status as SurveyTemplateStatus;
    const updated = await this.prisma.surveyTemplate.update({ where: { id }, data });
    return { success: true, data: updated };
  }

  async deleteTemplate(id: string, user: UserCtx) {
    const template = await this.prisma.surveyTemplate.findUnique({ where: { id } });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    await this.prisma.surveyTemplate.update({
      where: { id },
      data: { status: SurveyTemplateStatus.ARCHIVED },
    });
    return { success: true, data: { id } };
  }

  // ══════════════════════════════════════════════
  // QUESTIONS (within templates)
  // ══════════════════════════════════════════════

  async addQuestion(
    templateId: string,
    dto: { type: string; prompt: string; required?: boolean; order?: number; options?: { label: string; value: string; order?: number }[] },
    user: UserCtx,
  ) {
    const template = await this.prisma.surveyTemplate.findUnique({ where: { id: templateId } });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    const question = await this.prisma.surveyQuestion.create({
      data: {
        templateId,
        type: dto.type as SurveyQuestionType,
        prompt: dto.prompt,
        required: dto.required ?? true,
        order: dto.order ?? 0,
        options: dto.options?.length
          ? { create: dto.options.map((o, oi) => ({ label: o.label, value: o.value, order: o.order ?? oi })) }
          : undefined,
      },
      include: { options: true },
    });
    return { success: true, data: question };
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto, user: UserCtx) {
    const question = await this.prisma.surveyQuestion.findUnique({
      where: { id },
      include: { template: { select: { tenantId: true } } },
    });
    if (!question || (user.role !== Role.SUPER_ADMIN && question.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Question not found');
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.type) data.type = dto.type as SurveyQuestionType;
    const updated = await this.prisma.surveyQuestion.update({ where: { id }, data });
    return { success: true, data: updated };
  }

  async deleteQuestion(id: string, user: UserCtx) {
    const question = await this.prisma.surveyQuestion.findUnique({
      where: { id },
      include: { template: { select: { tenantId: true } } },
    });
    if (!question || (user.role !== Role.SUPER_ADMIN && question.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Question not found');
    }
    await this.prisma.surveyQuestion.delete({ where: { id } });
    return { success: true, data: { id } };
  }

  // ══════════════════════════════════════════════
  // SURVEYS
  // ══════════════════════════════════════════════

  async createSurvey(dto: CreateSurveyDto, user: UserCtx) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site || (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId)) {
      throw new NotFoundException('Site not found');
    }
    const template = await this.prisma.surveyTemplate.findUnique({
      where: { id: dto.templateId },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    if (template.status !== SurveyTemplateStatus.PUBLISHED) {
      throw new BadRequestException('Template must be published before creating a survey');
    }
    const tenantId = user.role === Role.SUPER_ADMIN ? template.tenantId : user.tenantId!;
    // Generate a unique public slug
    const publicSlug = `sv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const survey = await this.prisma.survey.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        templateId: dto.templateId,
        title: dto.title,
        channel: (dto.channel as any) ?? 'QR',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        publicSlug,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
          },
        },
        site: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: survey };
  }

  async listSurveys(
    user: UserCtx,
    filters?: { siteId?: string; status?: string; page?: number; limit?: number },
  ) {
    const where: Record<string, unknown> = this.tenantWhere(user);
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.status) where.status = filters.status;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const [data, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  async getSurvey(id: string, user: UserCtx) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
          },
        },
        site: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }
    return { success: true, data: survey };
  }

  async publishSurvey(id: string, user: UserCtx) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT surveys can be published');
    }
    const updated = await this.prisma.survey.update({
      where: { id },
      data: { status: SurveyStatus.PUBLISHED },
    });
    return { success: true, data: updated };
  }

  async closeSurvey(id: string, user: UserCtx) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }
    if (survey.status === SurveyStatus.CLOSED) {
      throw new BadRequestException('Survey is already closed');
    }
    const updated = await this.prisma.survey.update({
      where: { id },
      data: { status: SurveyStatus.CLOSED },
    });
    return { success: true, data: updated };
  }

  async deleteSurvey(id: string, user: UserCtx) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }
    await this.prisma.survey.delete({ where: { id } });
    return { success: true, data: { id } };
  }

  // ══════════════════════════════════════════════
  // PUBLIC (NO AUTH)
  // ══════════════════════════════════════════════

  async getPublicSurvey(publicSlug: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { publicSlug },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
        site: { select: { id: true, name: true } },
      },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new BadRequestException('This survey is not currently accepting responses');
    }
    if (survey.endsAt && new Date() > survey.endsAt) {
      throw new BadRequestException('This survey has ended');
    }
    // Return sanitized view (no internal IDs except what's needed)
    return {
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        siteName: survey.site.name,
        channel: survey.channel,
        questions: survey.template.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          required: q.required,
          order: q.order,
          options: q.options.map((o) => ({ id: o.id, label: o.label, value: o.value })),
        })),
      },
    };
  }

  async submitResponse(publicSlug: string, dto: SubmitResponseDto) {
    const survey = await this.prisma.survey.findUnique({
      where: { publicSlug },
      include: {
        template: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new BadRequestException('This survey is not currently accepting responses');
    }
    if (survey.endsAt && new Date() > survey.endsAt) {
      throw new BadRequestException('This survey has ended');
    }

    // Validate all required questions are answered
    const questionMap = new Map(survey.template.questions.map((q) => [q.id, q]));
    for (const q of survey.template.questions) {
      if (q.required) {
        const answer = dto.answers.find((a) => a.questionId === q.id);
        if (!answer) {
          throw new BadRequestException(`Question "${q.prompt}" is required`);
        }
        // For non-text types, validate the answer content
        const qt = q.type as string;
        if (['STAR_RATING', 'NPS', 'CSAT'].includes(qt) && (answer.ratingValue == null || answer.ratingValue < 0)) {
          throw new BadRequestException(`Question "${q.prompt}" requires a rating`);
        }
        if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(qt) && (!answer.choiceValues || answer.choiceValues.length === 0)) {
          throw new BadRequestException(`Question "${q.prompt}" requires a selection`);
        }
        if (qt === 'TEXT' && (!answer.answerText || !answer.answerText.trim())) {
          throw new BadRequestException(`Question "${q.prompt}" requires a text answer`);
        }
      }
    }

    // Filter out answers for questions that don't exist
    const validAnswers = dto.answers.filter((a) => questionMap.has(a.questionId));

    const response = await this.prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        orderId: dto.orderId,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        answers: {
          create: validAnswers.map((a) => ({
            questionId: a.questionId,
            answerText: a.answerText,
            ratingValue: a.ratingValue,
            choiceValues: a.choiceValues ?? [],
          })),
        },
      },
      include: { answers: true },
    });

    // Increment response count
    await this.prisma.survey.update({
      where: { id: survey.id },
      data: { responseCount: { increment: 1 } },
    });

    return { success: true, data: { id: response.id, submittedAt: response.submittedAt } };
  }

  // ══════════════════════════════════════════════
  // RESPONSES (AUTH)
  // ══════════════════════════════════════════════

  async listResponses(
    surveyId: string,
    user: UserCtx,
    filters?: { page?: number; limit?: number },
  ) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const [data, total] = await Promise.all([
      this.prisma.surveyResponse.findMany({
        where: { surveyId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: { answers: { include: { question: { select: { id: true, prompt: true, type: true } } } } },
      }),
      this.prisma.surveyResponse.count({ where: { surveyId } }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  async getAnalytics(surveyId: string, user: UserCtx) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        template: {
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!survey || (user.role !== Role.SUPER_ADMIN && survey.tenantId !== user.tenantId)) {
      throw new NotFoundException('Survey not found');
    }

    const responses = await this.prisma.surveyResponse.findMany({
      where: { surveyId },
      include: { answers: true },
    });

    const questionMap = new Map(survey.template.questions.map((q) => [q.id, q]));
    const totalResponses = responses.length;

    // Per-question analytics
    const questionAnalytics = survey.template.questions.map((q) => {
      const answers = responses.flatMap((r) => r.answers.filter((a) => a.questionId === q.id));
      const base: Record<string, unknown> = {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        responseCount: answers.length,
      };

      const qt = q.type as string;
      if (['STAR_RATING', 'NPS', 'CSAT'].includes(qt)) {
        const ratings = answers.map((a) => a.ratingValue).filter((v): v is number => v != null);
        const avg = ratings.length > 0 ? Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100) / 100 : null;
        // Distribution
        const distribution: Record<number, number> = {};
        ratings.forEach((r) => {
          distribution[r] = (distribution[r] || 0) + 1;
        });
        return { ...base, average: avg, distribution, ratingCount: ratings.length };
      }

      if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(qt)) {
        const choiceCounts: Record<string, number> = {};
        answers.forEach((a) => {
          (a.choiceValues || []).forEach((v) => {
            choiceCounts[v] = (choiceCounts[v] || 0) + 1;
          });
        });
        return { ...base, choiceCounts };
      }

      if (qt === 'TEXT') {
        const texts = answers.map((a) => a.answerText).filter(Boolean);
        return { ...base, textResponses: texts.slice(0, 100), textCount: texts.length };
      }

      return base;
    });

    // Overall NPS calculation
    const npsQuestions = survey.template.questions.filter((q) => q.type === SurveyQuestionType.NPS);
    let npsScore: number | null = null;
    if (npsQuestions.length > 0) {
      const allNps = responses.flatMap((r) =>
        r.answers.filter((a) => {
          const q = questionMap.get(a.questionId);
          return q?.type === SurveyQuestionType.NPS && a.ratingValue != null;
        }),
      );
      const ratings = allNps.map((a) => a.ratingValue!).filter((v) => v != null);
      if (ratings.length > 0) {
        const promoters = ratings.filter((r) => r >= 9).length;
        const detractors = ratings.filter((r) => r <= 6).length;
        npsScore = Math.round(((promoters - detractors) / ratings.length) * 100);
      }
    }

    // Overall CSAT average
    const csatQuestions = survey.template.questions.filter((q) => q.type === SurveyQuestionType.CSAT);
    let csatAverage: number | null = null;
    if (csatQuestions.length > 0) {
      const allCsat = responses.flatMap((r) =>
        r.answers.filter((a) => {
          const q = questionMap.get(a.questionId);
          return q?.type === SurveyQuestionType.CSAT && a.ratingValue != null;
        }),
      );
      const ratings = allCsat.map((a) => a.ratingValue!).filter((v) => v != null);
      if (ratings.length > 0) {
        csatAverage = Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100) / 100;
      }
    }

    // Response count over time (by day)
    const responsesByDate: Record<string, number> = {};
    responses.forEach((r) => {
      const day = r.submittedAt.toISOString().slice(0, 10);
      responsesByDate[day] = (responsesByDate[day] || 0) + 1;
    });

    return {
      success: true,
      data: {
        surveyId,
        totalResponses,
        npsScore,
        csatAverage,
        questionAnalytics,
        responsesByDate,
      },
    };
  }
}
