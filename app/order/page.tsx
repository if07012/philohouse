"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import OrderInfo from "./components/OrderInfo";
import CustomerForm, { validateIndonesianPhone } from "./components/CustomerForm";
import OrderType from "./components/OrderType";
import CookieItem from "./components/CookieItem";
import OrderSummary from "./components/OrderSummary";
import type { OrderState, OrderItem, SizeOption, CookieProduct } from "./types";
import {
  COOKIE_PRODUCTS,
  STORE_WHATSAPP_NUMBER,
  GOOGLE_SHEET_ID,
  getSpinChances,
  SPIN_PRIZES,
  buildWhatsAppOrderMessage,
  buildSheetRow,
  buildCookieDetailRows,
  buildSpinResultRow,
} from "./data/cookies";
import SpinWheel from "./components/SpinWheel";

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createOrderItem(
  product: CookieProduct,
  size: SizeOption,
  quantity: number
): OrderItem {
  const price = product.sizePrices[size];
  const subtotal = price * quantity;
  return {
    id: `${product.id}-${size}-${Date.now()}`,
    productId: product.id,
    name: product.name,
    image: product.image,
    size,
    price,
    quantity,
    subtotal,
  };
}

export default function OrderFormPage() {
  const [orderState, setOrderState] = useState<OrderState>(() => ({
    orderId: generateOrderId(),
    orderDate: formatDate(new Date()),
    customer: { name: "", whatsapp: "", address: "", note: "" },
    orderType: "single",
    items: [],
    total: 0,
  }));

  const [errors, setErrors] = useState<Partial<Record<"name" | "whatsapp" | "address" | "note", string>>>({});
  const [cookieSearch, setCookieSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [spinOrderInfo, setSpinOrderInfo] = useState<{
    orderId: string;
    customerName: string;
  } | null>(null);

  const updateTotal = useCallback((items: OrderItem[]) => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    setOrderState((prev) => ({ ...prev, items, total }));
  }, []);

  const addItem = useCallback(
    (product: CookieProduct, size: SizeOption = "400ml", quantity: number = 1) => {
      const newItem = createOrderItem(product, size, quantity);
      const newItems = [...orderState.items, newItem];
      updateTotal(newItems);
    },
    [orderState.items, updateTotal]
  );

  const updateItemSize = useCallback(
    (itemId: string, size: SizeOption) => {
      const product = COOKIE_PRODUCTS.find((p) =>
        orderState.items.some((i) => i.id === itemId && i.productId === p.id)
      );
      if (!product) return;
      const newItems = orderState.items.map((item) =>
        item.id === itemId
          ? {
            ...item,
            size,
            price: product.sizePrices[size],
            subtotal: product.sizePrices[size] * item.quantity,
          }
          : item
      );
      updateTotal(newItems);
    },
    [orderState.items, updateTotal]
  );

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const clampedQty = Math.max(1, quantity);
      const newItems = orderState.items.map((item) =>
        item.id === itemId
          ? {
            ...item,
            quantity: clampedQty,
            subtotal: item.price * clampedQty,
          }
          : item
      );
      updateTotal(newItems);
    },
    [orderState.items, updateTotal]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const newItems = orderState.items.filter((item) => item.id !== itemId);
      updateTotal(newItems);
    },
    [orderState.items, updateTotal]
  );

  const handleCustomerChange = useCallback(
    (field: "name" | "whatsapp" | "address" | "note", value: string) => {
      setOrderState((prev) => ({
        ...prev,
        customer: { ...prev.customer, [field]: value },
      }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [errors]
  );

  const handleOrderTypeChange = useCallback((orderType: "single" | "hampers") => {
    setOrderState((prev) => ({ ...prev, orderType }));
  }, []);

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};
    if (!orderState.customer.name.trim()) newErrors.name = "Name is required";
    if (!orderState.customer.whatsapp.trim())
      newErrors.whatsapp = "WhatsApp number is required";
    else if (!validateIndonesianPhone(orderState.customer.whatsapp))
      newErrors.whatsapp = "Please enter a valid Indonesian phone number (08x or +62)";
    if (!orderState.customer.address.trim())
      newErrors.address = "Shipping address is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;
    if (orderState.items.length === 0) {
      alert("Please add at least one cookie item to your order.");
      return false;
    }
    return true;
  }, [orderState.customer, orderState.items.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    const total = orderState.items.reduce((s, i) => s + i.subtotal, 0);
    const orderData = {
      orderId: orderState.orderId,
      orderDate: orderState.orderDate,
      customer: orderState.customer,
      orderType: orderState.orderType,
      items: orderState.items.map((i) => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })),
      total,
    };

    const chances = getSpinChances(total);
    if (chances >= 1) {
      setSpinsRemaining(chances);
      setSpinOrderInfo({
        orderId: orderData.orderId,
        customerName: orderData.customer.name,
      });
      setShowSpinWheel(true);
    }

    try {
      if (GOOGLE_SHEET_ID) {
        const sheetRow = buildSheetRow(orderData);
        const ordersRes = await fetch("/api/sheets/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId: GOOGLE_SHEET_ID,
            data: [sheetRow],
            sheetName: "Orders",
          }),
        });
        if (!ordersRes.ok) {
          const err = await ordersRes.json().catch(() => ({}));
          console.error("Google Sheet (Orders) write failed:", err);
          alert("Order saved to WhatsApp, but failed to save to Google Sheet.");
        } else {
          const cookieRows = buildCookieDetailRows({
            orderId: orderData.orderId,
            customer: { name: orderData.customer.name },
            items: orderData.items,
          });
          const detailsRes = await fetch("/api/sheets/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spreadsheetId: GOOGLE_SHEET_ID,
              data: cookieRows,
              sheetName: "Cookie Details",
            }),
          });
          if (!detailsRes.ok) {
            const err = await detailsRes.json().catch(() => ({}));
            console.error("Google Sheet (Cookie Details) write failed:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error saving to Google Sheet:", err);
      alert("Order saved to WhatsApp, but failed to save to Google Sheet.");
    } finally {
      setIsSubmitting(false);
    }



  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 sm:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-dark-blue sm:text-3xl">
            Cookie Order Form
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Fill in your details and select your favorite cookies
          </p>
        </header>

        <form id="order-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Order info & type - compact on mobile */}
          <section className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <OrderInfo
                orderId={orderState.orderId}
                orderDate={orderState.orderDate}
              />
              <OrderType
                value={orderState.orderType}
                onChange={handleOrderTypeChange}
              />
            </div>
            <CustomerForm
              customer={orderState.customer}
              onChange={handleCustomerChange}
              errors={errors}
            />
          </section>

          {/* Step 2: Add cookies - scrollable on mobile */}
          <section className="rounded-xl bg-white p-4 shadow-md sm:p-5">
            <h2 className="mb-2 text-base font-semibold text-dark-blue sm:text-lg">
              Add Cookies
            </h2>
            <p className="mb-4 text-xs text-gray-600 sm:text-sm">
              Tap &quot;Add to Order&quot; to add cookies to your cart. <b>You can add the same cookie more than once with different sizes.</b>
            </p>
            <div className="mb-4">
              <label htmlFor="cookie-search" className="sr-only">
                Search cookies
              </label>
              <input
                id="cookie-search"
                type="search"
                value={cookieSearch}
                onChange={(e) => setCookieSearch(e.target.value)}
                placeholder="Search cookies..."
                autoComplete="off"
                className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base placeholder-gray-400 focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
              />
            </div>
            {(() => {
              const query = cookieSearch.trim().toLowerCase();
              const filteredProducts = query
                ? COOKIE_PRODUCTS.filter((p) =>
                  p.name.toLowerCase().includes(query)
                )
                : COOKIE_PRODUCTS;
              return filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
                    >
                      <div className="relative aspect-square w-full bg-gray-100">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                        <h3 className="line-clamp-2 text-sm font-medium text-dark-blue sm:text-base">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                          From Rp {product.basePrice.toLocaleString("id-ID")}
                        </p>
                        <button
                          type="button"
                          onClick={() => addItem(product)}
                          className="mt-2 min-h-[44px] w-full rounded-lg bg-primary-pink px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-pink/90 active:scale-[0.98] sm:mt-3"
                        >
                          Add to Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">
                  No cookies found for &quot;{cookieSearch}&quot;
                </p>
              );
            })()}
          </section>

          {/* Step 3: Your order */}
          {orderState.items.length > 0 ? (
            <section className="rounded-xl bg-white p-4 shadow-md sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-dark-blue sm:text-lg">
                Your Order ({orderState.items.length} item
                {orderState.items.length !== 1 ? "s" : ""})
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {orderState.items.map((item) => {
                  const product = COOKIE_PRODUCTS.find(
                    (p) => p.id === item.productId
                  );
                  return (
                    <CookieItem
                      key={item.id}
                      item={item}
                      onSizeChange={updateItemSize}
                      onQuantityChange={updateItemQuantity}
                      onRemove={removeItem}
                      sizePrices={product?.sizePrices ?? { "400ml": 0, "600ml": 0, "800ml": 0 }}
                    />
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-500 sm:text-base">
                No cookies added yet. Tap &quot;Add to Order&quot; above to get
                started.
              </p>
            </div>
          )}

          {/* Summary + Submit - sticky on mobile */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <OrderSummary
              total={orderState.total}
              itemCount={orderState.items.length}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[48px] w-full rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg lg:w-auto lg:min-w-[200px]"
            >
              {isSubmitting ? "Saving..." : "Submit Order"}
            </button>
          </section>
        </form>
      </div>

      {showSpinWheel && spinOrderInfo && (
        <SpinWheel
          prizes={SPIN_PRIZES}
          spinsRemaining={spinsRemaining}
          onSpinComplete={async (prize) => {
            setSpinsRemaining((prev) => prev - 1);
            if (GOOGLE_SHEET_ID && prize.label !== "Try Again") {
              try {
                const row = buildSpinResultRow({
                  orderId: spinOrderInfo.orderId,
                  customerName: spinOrderInfo.customerName,
                  gift: prize.label,
                });
                await fetch("/api/sheets/write", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    spreadsheetId: GOOGLE_SHEET_ID,
                    data: [row],
                    sheetName: "Spin Rewards",
                  }),
                });
              } catch (err) {
                console.error("Failed to save spin reward:", err);
              }
            }
          }}
          onClose={() => {
            setShowSpinWheel(false);
            setSpinOrderInfo(null);
          }}
        />
      )}
    </div>
  );
}
