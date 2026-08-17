import { Module } from '@nestjs/common';
import { ExecAnalyticsController } from './exec-analytics.controller';
import { ExecAnalyticsService } from './exec-analytics.service';
import { RevenueAssuranceModule } from '../revenue-assurance/revenue-assurance.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [RevenueAssuranceModule, SurveysModule],
  controllers: [ExecAnalyticsController],
  providers: [ExecAnalyticsService],
})
export class ExecAnalyticsModule {}
