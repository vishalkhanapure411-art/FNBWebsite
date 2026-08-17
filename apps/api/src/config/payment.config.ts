import { PaymentMethod } from '@omniops/shared';

export interface PaymentConfig {
  /** Default currency for payments */
  defaultCurrency: string;
  /** Whether payments are enabled globally */
  paymentsEnabled: boolean;
  /** Which gateway to use per payment method */
  methodGatewayMap: Record<PaymentMethod, string | null>;
  /** Gateway configuration */
  gateways: {
    stripe: {
      secretKey: string;
      webhookSecret: string;
    };
  };
  /** Supported payment methods (can be overridden per site) */
  supportedMethods: PaymentMethod[];
  /** Mock mode: when true, all gateways return simulated success */
  mockMode: boolean;
}

export function paymentConfig(): PaymentConfig {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const mockMode = !stripeSecretKey || stripeSecretKey.startsWith('sk_test_') === false;

  return {
    defaultCurrency: process.env.PAYMENT_DEFAULT_CURRENCY ?? 'USD',
    paymentsEnabled: process.env.PAYMENTS_ENABLED !== 'false',
    methodGatewayMap: {
      [PaymentMethod.CARD]: 'stripe',
      [PaymentMethod.UPI]: 'stripe', // Stripe processes UPI in India
      [PaymentMethod.DIGITAL_WALLET]: 'stripe',
      [PaymentMethod.CASH]: null, // Cash is handled internally
      [PaymentMethod.NET_BANKING]: 'stripe',
      [PaymentMethod.BNPL]: 'stripe',
      [PaymentMethod.GIFT_CARD]: null,
      [PaymentMethod.STORE_CREDIT]: null,
      [PaymentMethod.LOYALTY_POINTS]: null,
    },
    gateways: {
      stripe: {
        secretKey: stripeSecretKey,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      },
    },
    supportedMethods: [
      PaymentMethod.CASH,
      PaymentMethod.CARD,
      PaymentMethod.UPI,
      PaymentMethod.DIGITAL_WALLET,
    ],
    mockMode: mockMode && process.env.NODE_ENV !== 'production',
  };
}
