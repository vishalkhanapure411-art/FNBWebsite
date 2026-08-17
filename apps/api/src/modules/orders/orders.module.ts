import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MenuModule } from '../menu/menu.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [MenuModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
