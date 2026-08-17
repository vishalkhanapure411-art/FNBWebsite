import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, ProcessPaymentInput, PaymentResult, RefundResult } from './payment-gateway.interface';
import { PaymentStatus } from '@omniops/shared';
import { paymentConfig } from '../../../config/payment.config';
import Stripe from 'stripe';

@Injectable()
export class StripeGateway implements PaymentGateway {
  private readonly logger = new Logger(StripeGateway.name);
  private readonly stripe: Stripe | null = null;
  private readonly config = paymentConfig();
  private readonly mockMode: boolean;

  constructor() {
    this.mockMode = this.config.mockMode;
    if (!this.mockMode && this.config.gateways.stripe.secretKey) {
      this.stripe = new Stripe(this.config.gateways.stripe.secretKey, {
        apiVersion: '2023-10-16' as any,
      });
      this.logger.log('Stripe gateway initialized with live key');
    } else {
      this.logger.log('Stripe gateway running in MOCK mode (no valid secret key configured)');
    }
  }

  async processPayment(data: ProcessPaymentInput): Promise<PaymentResult> {
    if (this.mockMode) {
      return this.mockProcessPayment(data);
    }

    try {
      const amountInCents = Math.round(data.amount * 100);

      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: amountInCents,
        currency: data.currency.toLowerCase(),
        metadata: {
          orderId: data.orderId,
          ...(data.metadata as Record<string, string>),
        },
        ...(data.gatewayData as any),
      });

      const status = this.mapStripeStatus(paymentIntent.status);

      return {
        success: true,
        transactionId: paymentIntent.id,
        status,
        response: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error: any) {
      this.logger.error('Stripe payment processing failed', error.stack);
      return {
        success: false,
        status: PaymentStatus.FAILED,
        error: error.message ?? 'Payment processing failed',
        response: error.raw ?? {},
      };
    }
  }

  async refundPayment(transactionId: string, amount: number, reason?: string): Promise<RefundResult> {
    if (this.mockMode) {
      return this.mockRefundPayment(transactionId, amount);
    }

    try {
      const amountInCents = Math.round(amount * 100);

      const refund = await this.stripe!.refunds.create({
        payment_intent: transactionId,
        amount: amountInCents,
        reason: 'requested_by_customer',
        metadata: reason ? { reason } : undefined,
      });

      return {
        success: true,
        refundTransactionId: refund.id,
        amount,
        response: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
        },
      };
    } catch (error: any) {
      this.logger.error('Stripe refund failed', error.stack);
      return {
        success: false,
        amount,
        error: error.message ?? 'Refund processing failed',
        response: error.raw ?? {},
      };
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    if (this.mockMode) {
      return PaymentStatus.CAPTURED;
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(transactionId);
      return this.mapStripeStatus(paymentIntent.status);
    } catch (error: any) {
      this.logger.error('Failed to retrieve payment status', error.stack);
      return PaymentStatus.FAILED;
    }
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return PaymentStatus.PENDING;
      case 'requires_capture':
        return PaymentStatus.AUTHORIZED;
      case 'succeeded':
        return PaymentStatus.CAPTURED;
      case 'canceled':
        return PaymentStatus.VOIDED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private mockProcessPayment(data: ProcessPaymentInput): PaymentResult {
    const transactionId = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.logger.log(`[MOCK] Processing payment: ${data.amount} ${data.currency} for order ${data.orderId}`);

    return {
      success: true,
      transactionId,
      status: PaymentStatus.CAPTURED,
      response: {
        id: transactionId,
        status: 'succeeded',
        amount: Math.round(data.amount * 100),
        currency: data.currency.toLowerCase(),
        mock: true,
      },
    };
  }

  private mockRefundPayment(transactionId: string, amount: number): RefundResult {
    const refundId = `mock_re_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.logger.log(`[MOCK] Refunding ${amount} for transaction ${transactionId}`);

    return {
      success: true,
      refundTransactionId: refundId,
      amount,
      response: {
        id: refundId,
        status: 'succeeded',
        amount: Math.round(amount * 100),
        mock: true,
      },
    };
  }
}
