import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TicketPriority } from '@omniops/shared';

export class CreateTicketDto {
  @IsString()
  siteId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsString()
  category!: string;
}
