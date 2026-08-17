'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { getAvailableMenu, type MenuItemData, type ModifierData, type CategoryData, type MenuData } from '@/lib/api/menu';
import { createOrder } from '@/lib/api/orders';
import { PaymentModal } from '@/components/payments/PaymentModal';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: Array<{ modifierName: string; priceAdjustment: number }>;
  notes: string;
}

export default function PosPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  // Menu state
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<CategoryData[]>([]);
  const [allItems, setAllItems] = useState<Record<string, MenuItemData[]>>({});
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Item modal
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemQty, setItemQty] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierData>>({});
  const [itemNotes, setItemNotes] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<string>('DINE_IN');
  const [orderTableId, setOrderTableId] = useState<string>('');
  const [orderGuestCount, setOrderGuestCount] = useState<number>(1);

  // Discount modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Placing
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Payment flow
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);

  // Fetch menu
  const fetchMenu = useCallback(async () => {
    setIsLoadingMenu(true);
    try {
      const res = await getAvailableMenu(siteId);
      const menuList = Array.isArray(res.data) ? res.data : [];
      setMenus(menuList);

      // Flatten categories and items
      const categories: CategoryData[] = [];
      const itemsMap: Record<string, MenuItemData[]> = {};

      for (const menu of menuList) {
        for (const cat of menu.categories ?? []) {
          categories.push({ ...cat, menuName: menu.name } as any);
          itemsMap[cat.id] = cat.items ?? [];
        }
      }

      setAllCategories(categories);
      setAllItems(itemsMap);

      if (categories.length > 0 && !activeCategoryId) {
        setActiveCategoryId(categories[0]!.id);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load menu', 'error');
    } finally {
      setIsLoadingMenu(false);
    }
  }, [siteId, addToast, activeCategoryId]);

  useEffect(() => {
    fetchMenu();
  }, []);

  // Cart calculations
  const cartSubTotal = cart.reduce((sum, item) => {
    const modifierTotal = item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
    return sum + (item.price + modifierTotal) * item.quantity;
  }, 0);

  const cartTotal = Math.max(0, cartSubTotal - cartSubTotal * (appliedDiscount / 100));
  const cartTax = cartTotal * 0.08; // Simplified 8% tax for display
  const cartGrandTotal = cartTotal + cartTax;

  // Add item to cart
  const handleAddToCart = () => {
    if (!selectedItem) return;

    const modifiers = Object.values(selectedModifiers).map((m) => ({
      modifierName: m.name,
      priceAdjustment: m.priceAdjustment,
    }));

    // Check if item with same modifiers already in cart
    const existingIdx = cart.findIndex(
      (ci) =>
        ci.menuItemId === selectedItem.id &&
        JSON.stringify(ci.modifiers) === JSON.stringify(modifiers) &&
        ci.notes === itemNotes,
    );

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx] = {
        ...updated[existingIdx]!,
        quantity: updated[existingIdx]!.quantity + itemQty,
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          menuItemId: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          quantity: itemQty,
          modifiers,
          notes: itemNotes,
        },
      ]);
    }

    setShowItemModal(false);
    setSelectedItem(null);
    setItemQty(1);
    setSelectedModifiers({});
    setItemNotes('');
  };

  // Open item modal
  const openItemModal = (item: MenuItemData) => {
    setSelectedItem(item);
    setItemQty(1);
    setSelectedModifiers({});
    setItemNotes('');
    setShowItemModal(true);
  };

  // Remove from cart
  const removeCartItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  // Place order (creates order, then shows payment modal)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      addToast('Add items to the order first', 'warning');
      return;
    }

    setIsPlacing(true);
    try {
      const res = await createOrder({
        siteId,
        orderType,
        tableId: orderTableId || undefined,
        guestCount: orderGuestCount,
        items: cart.map((ci) => ({
          menuItemId: ci.menuItemId,
          quantity: ci.quantity,
          modifiers: ci.modifiers.length > 0 ? ci.modifiers : undefined,
          notes: ci.notes || undefined,
        })),
        channel: 'POS',
      });

      const order = res.data;
      if (!order) {
        addToast('Failed to create order — no data returned', 'error');
        return;
      }
      setPaymentOrderId(order.id);
      setPlacedOrder(order);
      setShowPaymentModal(true);
      addToast(`Order ${(order as any).orderNumberDisplay} created`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to place order', 'error');
    } finally {
      setIsPlacing(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (result: any) => {
    setShowPaymentModal(false);
    setPaymentReceipt({
      order: placedOrder,
      payment: result,
    });
    setCart([]);
    setAppliedDiscount(0);
    addToast('Payment processed successfully!', 'success');
  };

  // Handle payment modal close (cancel payment)
  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentOrderId(null);
    // Order remains — user can pay later from orders page
  };

  // Start a completely new order
  const handleNewOrder = () => {
    setPlacedOrder(null);
    setPaymentReceipt(null);
    setPaymentOrderId(null);
    // Cart already cleared on payment success
  };

  // Current items for active category
  const currentCategory = allCategories.find((c) => c.id === activeCategoryId);
  const currentItems = activeCategoryId ? allItems[activeCategoryId] ?? [] : [];

  return (
    <div className="flex gap-0 h-[calc(100vh-180px)]">
      {/* Left Panel: Menu Browser */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-surface-200 dark:border-surface-700">
        {/* Order Type & Table Selector */}
        <div className="flex items-center gap-3 p-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
          >
            <option value="DINE_IN">Dine In</option>
            <option value="TAKEAWAY">Takeaway</option>
          </select>
          {orderType === 'DINE_IN' && (
            <>
              <input
                type="text"
                placeholder="Table #"
                value={orderTableId}
                onChange={(e) => setOrderTableId(e.target.value)}
                className="w-24 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                min="1"
                placeholder="Guests"
                value={orderGuestCount}
                onChange={(e) => setOrderGuestCount(parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
              />
            </>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategoryId === cat.id
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoadingMenu ? (
            <div className="flex items-center justify-center h-full text-surface-500">Loading menu...</div>
          ) : currentItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-surface-500">No items in this category</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openItemModal(item)}
                  className="text-left rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 hover:shadow-md hover:border-brand-300 transition-all"
                >
                  <div className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-1 line-clamp-2">
                    {item.name}
                  </div>
                  <div className="text-brand-600 font-bold text-sm">${Number(item.price).toFixed(2)}</div>
                  {item.dietaryTags && item.dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.dietaryTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.status === 'EIGHTY_SIX' && (
                    <span className="text-[10px] text-red-500 font-bold mt-1 block">86&apos;d</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Current Order */}
      <div className="w-96 flex flex-col bg-white dark:bg-surface-800">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">Current Order</h2>
          <p className="text-xs text-surface-500 mt-0.5">{orderType.replace('_', ' ')} • {cart.length} items</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">No items yet</p>
              <p className="text-xs mt-1">Tap menu items to add</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const modifierTotal = item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
              const itemTotal = (item.price + modifierTotal) * item.quantity;
              return (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-900"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-surface-500">×{item.quantity}</span>
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-surface-400 mt-0.5">
                        {item.modifiers.map((m) => m.modifierName).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-amber-600 mt-0.5 italic">Note: {item.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                      ${itemTotal.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeCartItem(idx)}
                      className="text-xs text-red-500 hover:text-red-700 p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totals & Actions */}
        <div className="border-t border-surface-200 dark:border-surface-700 p-4 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-surface-500">
              <span>Subtotal</span>
              <span>${cartSubTotal.toFixed(2)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount ({appliedDiscount}%)</span>
                <span>-${(cartSubTotal * (appliedDiscount / 100)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-surface-500">
              <span>Tax (8%)</span>
              <span>${cartTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-surface-900 dark:text-surface-50 pt-1 border-t border-surface-200 dark:border-surface-700">
              <span>Total</span>
              <span>${cartGrandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 transition-colors"
            >
              Discount
            </button>
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="flex-1 rounded-lg border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0 || isPlacing}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPlacing ? 'Placing Order...' : `Place Order • $${cartGrandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Item Detail Modal */}
      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title={selectedItem?.name ?? 'Item'} size="md">
        {selectedItem && (
          <div className="space-y-4">
            {selectedItem.description && (
              <p className="text-sm text-surface-500">{selectedItem.description}</p>
            )}

            <div className="text-2xl font-bold text-brand-600">${Number(selectedItem.price).toFixed(2)}</div>

            {/* Modifier Groups */}
            {selectedItem.modifierGroups && selectedItem.modifierGroups.length > 0 && (
              <div className="space-y-3">
                {selectedItem.modifierGroups.map((group) => (
                  <div key={group.id}>
                    <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">
                      {group.name}
                      {group.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-xs text-surface-400 ml-2">
                        {group.minSelect > 0 ? `Choose ${group.minSelect}-${group.maxSelect}` : `Up to ${group.maxSelect}`}
                      </span>
                    </label>
                    <div className="space-y-1">
                      {group.modifiers?.map((mod) => (
                        <label
                          key={mod.id}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedModifiers[mod.id]
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedModifiers[mod.id]}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModifiers({ ...selectedModifiers, [mod.id]: mod });
                                } else {
                                  const updated = { ...selectedModifiers };
                                  delete updated[mod.id];
                                  setSelectedModifiers(updated);
                                }
                              }}
                              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-surface-900 dark:text-surface-50">{mod.name}</span>
                          </div>
                          {mod.priceAdjustment > 0 && (
                            <span className="text-sm text-surface-500">+${mod.priceAdjustment.toFixed(2)}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Quantity</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                  className="w-8 h-8 rounded-lg border border-surface-300 dark:border-surface-600 flex items-center justify-center text-surface-600 hover:bg-surface-100"
                >
                  −
                </button>
                <span className="w-10 text-center text-lg font-semibold">{itemQty}</span>
                <button
                  onClick={() => setItemQty(itemQty + 1)}
                  className="w-8 h-8 rounded-lg border border-surface-300 dark:border-surface-600 flex items-center justify-center text-surface-600 hover:bg-surface-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Special Notes
              </label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="E.g., no onions, extra spicy..."
              />
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Add to Order — $
              {(
                (Number(selectedItem.price) +
                  Object.values(selectedModifiers).reduce((s, m) => s + m.priceAdjustment, 0)) *
                itemQty
              ).toFixed(2)}
            </button>
          </div>
        )}
      </Modal>

      {/* Discount Modal */}
      <Modal isOpen={showDiscountModal} onClose={() => setShowDiscountModal(false)} title="Apply Discount">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Discount Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="text-sm text-surface-500">
            Discount amount: ${(cartSubTotal * (discountPercent / 100)).toFixed(2)}
          </div>
          <button
            onClick={() => {
              setAppliedDiscount(discountPercent);
              setShowDiscountModal(false);
              addToast(`Applied ${discountPercent}% discount`, 'success');
            }}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Apply Discount
          </button>
        </div>
      </Modal>

      {/* Payment Modal */}
      {showPaymentModal && paymentOrderId && placedOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          orderId={paymentOrderId}
          cart={cart}
          cartSubTotal={cartSubTotal}
          cartTax={cartTax}
          cartGrandTotal={cartGrandTotal}
          discountPercent={appliedDiscount}
          isProcessing={isProcessingPayment}
          setIsProcessing={setIsProcessingPayment}
        />
      )}

      {/* Payment Receipt / Order Confirmation */}
      {paymentReceipt && (
        <Modal isOpen={!!paymentReceipt} onClose={handleNewOrder} title="Payment Complete! 🎉">
          <div className="space-y-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">✓ Paid</div>
            <div className="text-2xl font-bold text-brand-600">
              {(paymentReceipt.order as any).orderNumberDisplay}
            </div>
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-surface-600 dark:text-surface-400">
                <span>Items</span>
                <span>{paymentReceipt.order.items?.length ?? 0}</span>
              </div>
              <div className="flex justify-between font-bold text-surface-900 dark:text-surface-50">
                <span>Total</span>
                <span>${Number(paymentReceipt.order.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-surface-600 dark:text-surface-400 pt-1.5 border-t border-surface-200 dark:border-surface-700">
                <span>Payment Method</span>
                <span>{paymentReceipt.payment.method?.replace(/_/g, ' ') ?? 'Card'}</span>
              </div>
              {paymentReceipt.payment.cashChange !== undefined && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Change</span>
                  <span>${paymentReceipt.payment.cashChange.toFixed(2)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-surface-400">
              Payment ID: {paymentReceipt.payment.id?.slice(0, 8)}...
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const orderId = (paymentReceipt.order as any).id;
                  if (orderId) {
                    window.open(`/sites/${siteId}/cds?orderId=${orderId}`, '_blank');
                  }
                }}
                className="flex-1 rounded-lg border border-brand-300 dark:border-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
              >
                🖥️ Display on CDS
              </button>
              <button
                onClick={handleNewOrder}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                New Order
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
