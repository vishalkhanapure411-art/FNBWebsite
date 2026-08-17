import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  ProcessPaymentDto,
  RefundPaymentDto,
  SplitPaymentDto,
  QueryPaymentsDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Process a payment for an order' })
  processPayment(@Body() dto: ProcessPaymentDto, @Req() req: Request) {
    return this.paymentsService.processPayment(dto, req.user as any);
  }

  @Post('split')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Process split payments for one order' })
  splitPayment(@Body() dto: SplitPaymentDto, @Req() req: Request) {
    return this.paymentsService.splitPayment(dto, req.user as any);
  }

  @Post(':id/refund')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Refund a payment (requires manager approval)' })
  refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.refundPayment(id, dto, req.user as any);
  }

  @Post(':id/void')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Void a payment before capture (requires manager approval)' })
  voidPayment(@Param('id') id: string, @Req() req: Request) {
    return this.paymentsService.voidPayment(id, req.user as any);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'List payments with filtering and pagination' })
  findAll(@Query() query: QueryPaymentsDto, @Req() req: Request) {
    return this.paymentsService.findAll(query, req.user as any);
  }

  @Get('order/:orderId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Get all payments for an order' })
  findByOrder(@Param('orderId') orderId: string, @Req() req: Request) {
    return this.paymentsService.findByOrder(orderId, req.user as any);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Get payment detail with order summary' })
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.paymentsService.findById(id, req.user as any);
  }
}
