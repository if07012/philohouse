"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import OrderInfo from "../../components/OrderInfo";
import CustomerForm, { validateIndonesianPhone } from "../../components/CustomerForm";
import OrderType from "../../components/OrderType";
import CookieItem from "../../components/CookieItem";
import OrderSummary from "../../components/OrderSummary";
import type { OrderState, OrderItem, SizeOption, CookieProduct } from "../../types";
import {
  COOKIE_PRODUCTS,
  GOOGLE_SHEET_ID,
  buildSheetRow,
  buildCookieDetailRows,
} from "../../data/cookies";

function createOrderItem(
  product: CookieProduct,
  size: SizeOption,
  quantity: number
): OrderItem {
  const price = product.sizePrices[size];
  const subtotal = price * quantity;
  return {
    id: `${product.id}-${size}-${Date.now()}-${Math.random()}`,
    productId: product.id,
    name: product.name,
    image: product.image,
    size,
    price,
    quantity,
    subtotal,
  };
}

// Parse items string from Google Sheets format: "Cookie Name Size x Quantity = Rp Subtotal | ..."
function parseItemsFromSheet(itemsStr: string, cookieDetails: any[]): OrderItem[] {
  if (!itemsStr && cookieDetails.length > 0) {
    // Use cookie details if available
    return cookieDetails.map((detail, idx) => {
      const product = COOKIE_PRODUCTS.find((p) => p.name === detail['Cookie Name']);
      const size = detail.Size as SizeOption;
      const quantity = parseInt(detail.Quantity) || 1;
      const subtotal = parseFloat(detail.Subtotal) || 0;
      
      if (product) {
        return {
          id: `${product.id}-${size}-${idx}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          image: product.image,
          size,
          price: product.sizePrices[size],
          quantity,
          subtotal,
        };
      }
      // Fallback if product not found
      return {
        id: `unknown-${idx}-${Date.now()}`,
        productId: 'unknown',
        name: detail['Cookie Name'] || 'Unknown Cookie',
        image: '/cookies/choco-chip.jpg',
        size,
        price: subtotal / quantity,
        quantity,
        subtotal,
      };
    });
  }

  if (!itemsStr) return [];

  const items: OrderItem[] = [];
  const parts = itemsStr.split(' | ');

  parts.forEach((part, idx) => {
    // Format: "Cookie Name Size x Quantity = Rp Subtotal"
    const match = part.match(/^(.+?)\s+(400ml|600ml|800ml)\s+x\s+(\d+)\s+=\s+Rp\s+([\d.,]+)$/);
    if (match) {
      const [, name, size, qtyStr, subtotalStr] = match;
      const quantity = parseInt(qtyStr);
      const subtotal = parseFloat(subtotalStr.replace(/\./g, '').replace(',', '.'));

      const product = COOKIE_PRODUCTS.find((p) => p.name === name.trim());
      if (product) {
        items.push({
          id: `${product.id}-${size}-${idx}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          image: product.image,
          size: size as SizeOption,
          price: product.sizePrices[size as SizeOption],
          quantity,
          subtotal,
        });
      }
    }
  });

  return items;
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [orderState, setOrderState] = useState<OrderState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<"name" | "whatsapp" | "address" | "note", string>>>({});
  const [cookieSearch, setCookieSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          setLoadError(data.error || 'Failed to load order');
          return;
        }
        const { order, cookieDetails } = await res.json();

        // Parse order type
        const orderType = order['Order Type']?.includes('Hampers') ? 'hampers' : 'single';

        // Parse items
        const items = parseItemsFromSheet(order.Items || '', cookieDetails || []);

        setOrderState({
          orderId: order['Order ID'],
          orderDate: order['Order Date'],
          customer: {
            name: order['Customer Name'] || '',
            whatsapp: order['WhatsApp'] || '',
            address: order['Address'] || '',
            note: order['Note'] || '',
          },
          orderType,
          items,
          total: parseFloat(order['Total']) || 0,
        });
      } catch (err) {
        console.error('Error loading order:', err);
        setLoadError('Failed to load order');
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const updateTotal = useCallback((items: OrderItem[]) => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    setOrderState((prev) => prev ? { ...prev, items, total } : null);
  }, []);

  const addItem = useCallback(
    (product: CookieProduct, size: SizeOption = "400ml", quantity: number = 1) => {
      if (!orderState) return;
      const newItem = createOrderItem(product, size, quantity);
      const newItems = [...orderState.items, newItem];
      updateTotal(newItems);
    },
    [orderState, updateTotal]
  );

  const updateItemSize = useCallback(
    (itemId: string, size: SizeOption) => {
      if (!orderState) return;
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
    [orderState, updateTotal]
  );

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (!orderState) return;
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
    [orderState, updateTotal]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      if (!orderState) return;
      const newItems = orderState.items.filter((item) => item.id !== itemId);
      updateTotal(newItems);
    },
    [orderState, updateTotal]
  );

  const handleCustomerChange = useCallback(
    (field: "name" | "whatsapp" | "address" | "note", value: string) => {
      if (!orderState) return;
      setOrderState((prev) => prev ? {
        ...prev,
        customer: { ...prev.customer, [field]: value },
      } : null);
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [orderState, errors]
  );

  const handleOrderTypeChange = useCallback((orderType: "single" | "hampers") => {
    if (!orderState) return;
    setOrderState((prev) => prev ? { ...prev, orderType } : null);
  }, [orderState]);

  const validate = useCallback(() => {
    if (!orderState) return false;
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
      setTimeout(() => {
        const cookieSection = document.querySelector('[id="cookie-search"]')?.closest('section');
        if (cookieSection) {
          cookieSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return false;
    }
    return true;
  }, [orderState, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderState || !validate()) return;
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

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Update failed:", err);
        alert("Failed to update order. Please try again.");
        return;
      }

      alert("Order updated successfully!");
      router.push(`/order/thanks?orderId=${orderId}`);
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Failed to update order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (loadError || !orderState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-dark-blue mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{loadError || "The order could not be loaded."}</p>
          <button
            onClick={() => router.push("/order")}
            className="min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90"
          >
            Back to Order Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 sm:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-dark-blue sm:text-3xl">
            Pesanan
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Update detail pesanan
          </p>
        </header>

        <form id="order-form" onSubmit={handleSubmit} className="space-y-6">
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

          <section className="rounded-xl bg-white p-4 shadow-md sm:p-5">
            <h2 className="mb-2 text-base font-semibold text-dark-blue sm:text-lg">
              Tambahkan Kue
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
                  Tidak ada kue yang ditemukan untuk &quot;{cookieSearch}&quot;
                </p>
              );
            })()}
          </section>

          {orderState.items.length > 0 ? (
            <section className="rounded-xl bg-white p-4 shadow-md sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-dark-blue sm:text-lg">
                Pesanan Anda ({orderState.items.length} item
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

          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <OrderSummary
              total={orderState.total}
              itemCount={orderState.items.length}
              hideSpin={true}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[48px] w-full rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg lg:w-auto lg:min-w-[200px]"
            >
              {isSubmitting ? "Mengupdate..." : "Update Pesanan"}
            </button>
          </section>
        </form>

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
    </div>
  );
}
