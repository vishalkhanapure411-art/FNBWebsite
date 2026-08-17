import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeGateway } from './gateways/stripe.gateway';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
