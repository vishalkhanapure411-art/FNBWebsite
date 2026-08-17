import { PaymentMethod, PaymentStatus } from '@omniops/shared';

export interface ProcessPaymentInput {
  amount: number;
  currency: string;
  method: PaymentMethod;
  orderId: string;
  metadata?: Record<string, unknown>;
  gatewayData?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  response?: Record<string, unknown>;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  amount: number;
  response?: Record<string, unknown>;
  error?: string;
}

export interface PaymentGateway {
  processPayment(data: ProcessPaymentInput): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number, reason?: string): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
}

export type GatewayName = 'stripe' | string;
