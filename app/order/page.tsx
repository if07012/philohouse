"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
  buildTelegramOrderMessage,
} from "./data/cookies";
import SpinWheel from "./components/SpinWheel";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function generateOrderId(): string {
  return `PHILO-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createOrderItem(
  product: CookieProduct,
  size: SizeOption,
  quantity: number
): OrderItem {
  let price = product.sizePrices[size];
  if(!price)
    price = product.sizePrices["Satuan"]
  debugger
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

const SALES_STORAGE_KEY = "cookie_order_sales_id";

export default function OrderFormPage() {
  const searchParams = useSearchParams();
  const salesParam = searchParams.get("sales") || "";
  
  // Get sales from query param or localStorage
  const getInitialSales = () => {
    if (salesParam) {
      // Save to localStorage if provided via query param
      if (typeof window !== "undefined") {
        localStorage.setItem(SALES_STORAGE_KEY, salesParam);
      }
      return salesParam;
    }
    // Try to get from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem(SALES_STORAGE_KEY) || "";
    }
    return "";
  };
  
  const [orderState, setOrderState] = useState<OrderState>(() => ({
    orderId: generateOrderId(),
    orderDate: formatDate(new Date()),
    customer: { name: "", whatsapp: "", address: "", note: "", sales: getInitialSales() },
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
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);
  const [giftsWon, setGiftsWon] = useState<string[]>([]);
  const router = useRouter();

  // Update sales if query parameter changes
  useEffect(() => {
    if (salesParam) {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(SALES_STORAGE_KEY, salesParam);
      }
      setOrderState((prev) => ({
        ...prev,
        customer: { ...prev.customer, sales: salesParam },
      }));
    }
  }, [salesParam]);

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
      const clampedQty = Math.max(0, quantity);
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
    (field: "name" | "whatsapp" | "address" | "note" | "sales", value: string) => {
      // Sales is read-only, don't allow changes
      if (field === "sales") return;
      
      setOrderState((prev) => ({
        ...prev,
        customer: { ...prev.customer, [field]: value },
      }));
      if (errors[field as keyof typeof errors]) setErrors((prev) => ({ ...prev, [field as keyof typeof errors]: undefined }));
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
    if (Object.keys(newErrors).length > 0) {
      // Find the first error field and scroll to it
      const firstErrorField = Object.keys(newErrors)[0] as keyof typeof newErrors;
      const fieldIdMap: Record<string, string> = {
        name: "customer-name",
        whatsapp: "customer-whatsapp",
        address: "customer-address",
      };
      const fieldId = fieldIdMap[firstErrorField];
      if (fieldId) {
        setTimeout(() => {
          const element = document.getElementById(fieldId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
          }
        }, 100);
      }
      return false;
    }
    if (orderState.items.length === 0) {
      alert("Please add at least one cookie item to your order.");
      // Scroll to the cookie section
      setTimeout(() => {
        const cookieSection = document.querySelector('[id="cookie-search"]')?.closest('section');
        if (cookieSection) {
          cookieSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
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
    const willShowSpin = chances >= 1;
    if (willShowSpin) {
      setSpinsRemaining(chances);
      setSpinOrderInfo({
        orderId: orderData.orderId,
        customerName: orderData.customer.name,
      });
      setShowSpinWheel(true);
    }

    let submittedSuccessfully = true;
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
          submittedSuccessfully = false;
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
          } else {
            // Send Telegram notification after successful save (only if spin wheel won't be shown)
            // If spin wheel will be shown, notification will be sent after it closes
            if (!willShowSpin) {
              try {
                const telegramMessage = buildTelegramOrderMessage({
                  ...orderData,
                  gifts: giftsWon.length > 0 ? giftsWon : undefined,
                });
                await fetch("/api/telegram/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ message: telegramMessage }),
                });
              } catch (telegramErr) {
                console.error("Failed to send Telegram notification:", telegramErr);
                // Don't fail the order submission if Telegram fails
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error saving to Google Sheet:", err);
      alert("Order saved to WhatsApp, but failed to save to Google Sheet.");
      submittedSuccessfully = false;
    } finally {
      if (submittedSuccessfully) setSubmitSucceeded(true);
    }
  };

  useEffect(() => {
    if (submitSucceeded && !showSpinWheel) {
      router.push(`/order/thanks?orderId=${orderState.orderId}`);
    }
  }, [submitSucceeded, showSpinWheel, router, orderState.orderId]);

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.REACT_APP_RECAPTCHA_SITE_KEY!}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
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
                Tambah Kue
              </h2>
              <p className="mb-4 text-xs text-gray-600 sm:text-sm">
                Tap &quot;Tambahkan ke Pesanan&quot; untuk menambahkan kue ke pesanan Anda. <b>Anda dapat menambahkan kue yang sama lebih dari satu kali dengan ukuran yang berbeda.</b>
              </p>
              <div className="mb-4">
                <label htmlFor="cookie-search" className="sr-only">
                  Cari kue
                </label>
                <input
                  id="cookie-search"
                  type="search"
                  value={cookieSearch}
                  onChange={(e) => setCookieSearch(e.target.value)}
                  placeholder="Cari kue..."
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
                        <div className="relative aspect-square w-full bg-gray-100 group cursor-pointer">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            unoptimized
                            onClick={() => setFullscreenImage({ src: product.image, alt: product.name })}
                          />
                          <button
                            type="button"
                            onClick={() => setFullscreenImage({ src: product.image, alt: product.name })}
                            className="absolute top-2 right-2 min-h-[32px] min-w-[32px] rounded-full bg-black/50 backdrop-blur-sm p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 active:scale-95"
                            aria-label="View fullscreen"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                          <h3 className="line-clamp-2 text-sm font-medium text-dark-blue sm:text-base">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                            Dari Rp {product.basePrice.toLocaleString("id-ID")}
                          </p>
                          <button
                            type="button"
                            onClick={() => addItem(product)}
                            className="mt-2 min-h-[44px] w-full rounded-lg bg-primary-pink px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-pink/90 active:scale-[0.98] sm:mt-3"
                          >
                            Tambahkan ke Pesanan
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
                Tidak ada kue yang ditambahkan. Tap &quot;Tambahkan ke Pesanan&quot; di atas untuk memulai.
                
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
                {isSubmitting ? "Saving..." : "Simpan"}
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
              // Track gift if not "Try Again"
              if (prize.label !== "Try Again") {
                setGiftsWon((prev) => [...prev, prize.label]);
                
                if (GOOGLE_SHEET_ID) {
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
              }
            }}
            onClose={async () => {
              setShowSpinWheel(false);
              
              // Send Telegram notification after spin wheel closes (if order was successfully submitted)
              // This ensures gifts are included in the notification
              if (submitSucceeded) {
                try {
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
                    total: orderState.total,
                  };
                  const telegramMessage = buildTelegramOrderMessage({
                    ...orderData,
                    gifts: giftsWon,
                  });
                  await fetch("/api/telegram/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: telegramMessage }),
                  });
                } catch (telegramErr) {
                  console.error("Failed to send Telegram notification:", telegramErr);
                }
              }
              
              setSpinOrderInfo(null);
              router.push(`/order/thanks?orderId=${orderState.orderId}`);
            }}
          />
        )}

        {/* Fullscreen Image Modal */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-full bg-white/10 backdrop-blur-sm p-2 text-white transition-colors hover:bg-white/20 active:scale-95"
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div
              className="relative h-full w-full max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={fullscreenImage.src}
                alt={fullscreenImage.alt}
                fill
                className="object-contain"
                sizes="90vw"
                unoptimized
                priority
              />
            </div>
          </div>
        )}
      </div>
    </GoogleReCaptchaProvider>

  );
}
