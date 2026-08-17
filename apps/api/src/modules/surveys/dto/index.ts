import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsInt, Min, Max, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Template DTOs ───

export class CreateQuestionOptionDto {
  @IsString()
  label!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateQuestionDto {
  @IsEnum(['STAR_RATING', 'NPS', 'CSAT', 'TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  type!: 'STAR_RATING' | 'NPS' | 'CSAT' | 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];
}

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsEnum(['STAR_RATING', 'NPS', 'CSAT', 'TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  type?: 'STAR_RATING' | 'NPS' | 'CSAT' | 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

// ─── Survey DTOs ───

export class CreateSurveyDto {
  @IsString()
  siteId!: string;

  @IsString()
  templateId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEnum(['QR', 'EMAIL', 'SMS', 'IN_STORE'])
  channel?: 'QR' | 'EMAIL' | 'SMS' | 'IN_STORE';

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class PublishSurveyDto {
  @IsEnum(['PUBLISHED'])
  status!: 'PUBLISHED';
}

export class CloseSurveyDto {
  @IsEnum(['CLOSED'])
  status!: 'CLOSED';
}

// ─── Response DTOs ───

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  ratingValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choiceValues?: string[];
}

export class SubmitResponseDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}
