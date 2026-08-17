'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { processPayment } from '@/lib/api/payments';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: Array<{ modifierName: string; priceAdjustment: number }>;
  notes: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  orderId: string;
  cart: CartItem[];
  cartSubTotal: number;
  cartTax: number;
  cartGrandTotal: number;
  discountPercent: number;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

type PaymentMethodTab = 'CARD' | 'CASH' | 'UPI' | 'DIGITAL_WALLET';

const PAYMENT_METHODS: { key: PaymentMethodTab; label: string; icon: string }[] = [
  { key: 'CARD', label: 'Card', icon: '💳' },
  { key: 'CASH', label: 'Cash', icon: '💵' },
  { key: 'UPI', label: 'UPI', icon: '📱' },
  { key: 'DIGITAL_WALLET', label: 'Wallet', icon: '🪪' },
];

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  cart,
  cartSubTotal,
  cartTax,
  cartGrandTotal,
  discountPercent,
  isProcessing,
  setIsProcessing,
}: PaymentModalProps) {
  const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCashTendered('');
      setActiveMethod('CARD');
    }
  }, [isOpen]);

  const cashChange = cashTendered
    ? Math.max(0, parseFloat(cashTendered) - cartGrandTotal)
    : 0;

  const handleProcessPayment = async () => {
    setError(null);

    if (activeMethod === 'CASH') {
      const tendered = parseFloat(cashTendered);
      if (!tendered || tendered < cartGrandTotal) {
        setError('Tendered amount must be at least the order total');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const result = await processPayment({
        orderId,
        method: activeMethod,
        gatewayData:
          activeMethod === 'CARD'
            ? { cardNumber: cardNumber.replace(/\s/g, ''), expiry: cardExpiry, cvc: cardCvc }
            : undefined,
      });

      if (result.success) {
        onSuccess({
          ...result.data,
          method: activeMethod,
          cashChange: activeMethod === 'CASH' ? cashChange : undefined,
        });
      } else {
        setError((result as any).message || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="md">
      <div className="space-y-5">
        {/* Order Summary */}
        <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between text-sm text-surface-600 dark:text-surface-400">
            <span>Items ({cart.length})</span>
            <span>${cartSubTotal.toFixed(2)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount ({discountPercent}%)</span>
              <span>-${(cartSubTotal * (discountPercent / 100)).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-surface-600 dark:text-surface-400">
            <span>Tax</span>
            <span>${cartTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-surface-900 dark:text-surface-50 pt-1.5 border-t border-surface-200 dark:border-surface-700">
            <span>Total</span>
            <span>${cartGrandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div>
          <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setActiveMethod(m.key);
                  setError(null);
                }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-sm ${
                  activeMethod === m.key
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300'
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Form */}
        {activeMethod === 'CARD' && (
          <div className="space-y-3 p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
            <div className="text-xs text-surface-400 mb-2">Card details are for display only — processed through Stripe</div>
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Cash Tender */}
        {activeMethod === 'CASH' && (
          <div className="space-y-3 p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Tendered Amount
              </label>
              <input
                type="number"
                step="0.01"
                min={cartGrandTotal}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={`Min: $${cartGrandTotal.toFixed(2)}`}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-lg font-bold text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {cashTendered && parseFloat(cashTendered) >= cartGrandTotal && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600 dark:text-surface-400">Change due:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    ${cashChange.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPI / Digital Wallet — simplified */}
        {(activeMethod === 'UPI' || activeMethod === 'DIGITAL_WALLET') && (
          <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-center">
            <div className="text-4xl mb-2">{activeMethod === 'UPI' ? '📱' : '🪪'}</div>
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {activeMethod === 'UPI' ? 'UPI payment will be processed through Stripe' : 'Digital wallet payment will be processed through Stripe'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={handleProcessPayment}
          disabled={isProcessing || !orderId}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${cartGrandTotal.toFixed(2)}`
          )}
        </button>

        <p className="text-xs text-center text-surface-400">
          Payments are securely processed through Stripe
          {activeMethod === 'CASH' && ' — cash payments are recorded directly'}
        </p>
      </div>
    </Modal>
  );
}
