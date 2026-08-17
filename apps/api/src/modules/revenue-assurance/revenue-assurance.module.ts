import { Module } from '@nestjs/common';
import { RevenueAssuranceController } from './revenue-assurance.controller';
import { RevenueAssuranceService } from './revenue-assurance.service';

@Module({
  controllers: [RevenueAssuranceController],
  providers: [RevenueAssuranceService],
  exports: [RevenueAssuranceService],
})
export class RevenueAssuranceModule {}
