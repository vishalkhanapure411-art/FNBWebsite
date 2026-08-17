import { Module } from '@nestjs/common';
import { CdsController } from './cds.controller';
import { CdsService } from './cds.service';
import { CdsGateway } from './cds.gateway';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [CdsController],
  providers: [CdsService, CdsGateway],
  exports: [CdsService, CdsGateway],
})
export class CdsModule {}
