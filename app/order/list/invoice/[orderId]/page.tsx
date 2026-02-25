"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoiceOrder,
  type InvoiceExtraItem,
} from "../../../components/InvoiceDocument";

interface Order {
  "Order ID": string;
  "Order Date": string;
  "Customer Name": string;
  WhatsApp: string;
  Address: string;
  Note: string;
  "Order Type": string;
  Items: string;
  Total: number;
  cookieDetails: Array<{
    "Cookie Name": string;
    Size: string;
    Quantity: number;
    Subtotal: number;
  }>;
}

type DiscountType = "percent" | "fixed";

interface CustomItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function computeDiscount(subtotal: number, type: DiscountType, value: number): number {
  if (value <= 0) return 0;
  if (type === "percent") return Math.round((subtotal * value) / 100);
  return Math.min(value, subtotal);
}

export default function InvoicePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [extraItems, setExtraItems] = useState<CustomItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState<string>("1");
  const [newItemPrice, setNewItemPrice] = useState<string>("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("orders_list_authenticated");
    if (!isAuthenticated) {
      router.push("/order/list/login");
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth || !orderId) return;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Order not found");
          return;
        }
        const data = await res.json();
        const o = data.order;
        const cookieDetails = data.cookieDetails || [];
        setOrder({
          "Order ID": o["Order ID"],
          "Order Date": o["Order Date"] || "",
          "Customer Name": o["Customer Name"] || "",
          WhatsApp: o.WhatsApp || "",
          Address: o.Address || "",
          Note: o.Note || "",
          "Order Type": o["Order Type"] || "",
          Items: o.Items || "",
          Total: Number(o.Total) || 0,
          cookieDetails: cookieDetails.map((c: any) => ({
            "Cookie Name": c["Cookie Name"] || "",
            Size: c.Size || "",
            Quantity: Number(c.Quantity) || 0,
            Subtotal: Number(c.Subtotal) || 0,
          })),
        });
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [isCheckingAuth, orderId]);

  const orderSubtotal = order ? Number(order.Total) : 0;
  const extraSubtotal = extraItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
  const subtotal = orderSubtotal + extraSubtotal;
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount = computeDiscount(subtotal, discountType, discountNum);
  const totalAfterDiscount = subtotal - discountAmount;
  const hasDiscount = discountAmount > 0;

  const addExtraItem = () => {
    const name = newItemName.trim();
    const qty = parseInt(newItemQty, 10) || 1;
    const price = parseFloat(newItemPrice) || 0;
    if (!name || price <= 0) return;
    setExtraItems((prev) => [...prev, { name, quantity: qty, unitPrice: price }]);
    setNewItemName("");
    setNewItemQty("1");
    setNewItemPrice("");
  };

  const removeExtraItem = (index: number) => {
    setExtraItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdf = async () => {
    if (!order) return;
    setSaveError(null);
    try {
      setGeneratingPdf(true);
      const discount = hasDiscount
        ? { type: discountType, value: discountNum }
        : undefined;
      const finalTotal = hasDiscount ? totalAfterDiscount : subtotal;
      const extraForApi: InvoiceExtraItem[] = extraItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

      const saveRes = await fetch("/api/invoice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order["Order ID"],
          order: {
            "Order ID": order["Order ID"],
            "Order Date": order["Order Date"],
            "Customer Name": order["Customer Name"],
            WhatsApp: order.WhatsApp,
            Address: order.Address,
            Note: order.Note,
            "Order Type": order["Order Type"],
            Total: order.Total,
            cookieDetails: order.cookieDetails,
          },
          extraItems: extraForApi,
          discount,
          subtotal,
          discountAmount,
          total: finalTotal,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        setSaveError(err.error || "Failed to save invoice to sheet");
        return;
      }

      const blob = await pdf(
        <InvoiceDocument
          order={order as InvoiceOrder}
          discount={discount}
          totalAfterDiscount={finalTotal}
          extraItems={extraForApi}
          subtotalOverride={subtotal}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order["Order ID"]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error generating invoice PDF:", e);
      setSaveError("Failed to generate invoice PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto" />
          <p className="mt-4 text-gray-600">
            {isCheckingAuth ? "Checking authentication..." : "Loading order..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-dark-blue mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || "Order not found"}</p>
          <Link
            href="/order/list"
            className="inline-block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90"
          >
            Back to Order List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-blue">Invoice Preview</h1>
            <p className="mt-1 text-sm text-gray-600">
              Order {order["Order ID"]} • Add discount and generate PDF
            </p>
          </div>
          <Link
            href="/order/list"
            className="inline-block min-h-[44px] rounded-xl bg-gray-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-gray-700 text-center"
          >
            Back to List
          </Link>
        </header>

        <div className="rounded-xl bg-white p-6 shadow-md space-y-6">
          {/* Order info */}
          <section>
            <h2 className="text-lg font-semibold text-dark-blue mb-3">Bill To</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span>{" "}
                {order["Customer Name"]}
              </div>
              <div>
                <span className="text-gray-600">WhatsApp:</span> {order.WhatsApp}
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-600">Address:</span> {order.Address}
              </div>
              {order.Note && (
                <div className="sm:col-span-2">
                  <span className="text-gray-600">Note:</span> {order.Note}
                </div>
              )}
            </div>
          </section>

          {/* Items preview */}
          <section>
            <h2 className="text-lg font-semibold text-dark-blue mb-3">Items</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-blue text-white">
                    <th className="text-left py-2 px-3">Item</th>
                    <th className="text-left py-2 px-3">Size</th>
                    <th className="text-right py-2 px-3">Qty</th>
                    <th className="text-right py-2 px-3">Subtotal</th>
                    {extraItems.length > 0 ? (
                      <th className="py-2 px-3 w-20" />
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {order.cookieDetails?.map((cookie, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-gray-200 even:bg-gray-50"
                    >
                      <td className="py-2 px-3">{cookie["Cookie Name"]}</td>
                      <td className="py-2 px-3">{cookie.Size}</td>
                      <td className="py-2 px-3 text-right">
                        {cookie.Quantity}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatRupiah(Number(cookie.Subtotal))}
                      </td>
                      {extraItems.length > 0 ? <td /> : null}
                    </tr>
                  ))}
                  {extraItems.map((item, idx) => (
                    <tr
                      key={`extra-${idx}`}
                      className="border-t border-gray-200 even:bg-gray-50"
                    >
                      <td className="py-2 px-3">{item.name}</td>
                      <td className="py-2 px-3">-</td>
                      <td className="py-2 px-3 text-right">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatRupiah(item.quantity * item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 w-20">
                        <button
                          type="button"
                          onClick={() => removeExtraItem(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add new item */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-dark-blue mb-3">
                Add new item
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Item name"
                    className="w-full min-h-[40px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full min-h-[40px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30"
                  />
                </div>
                <div className="min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[40px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={addExtraItem}
                  className="min-h-[40px] rounded-lg bg-dark-blue px-4 py-2 text-sm font-medium text-white hover:bg-dark-blue/90"
                >
                  Add item
                </button>
              </div>
            </div>
            {extraItems.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Extra items subtotal: {formatRupiah(extraSubtotal)}
              </p>
            )}
          </section>

          {/* Discount */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-dark-blue mb-3">
              Diskon
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountType)
                  }
                  className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {discountType === "percent" ? "Percentage" : "Amount (Rp)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? 100 : undefined}
                  step={discountType === "percent" ? 1 : 1000}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 50000"}
                  className="min-h-[44px] w-full min-w-[140px] rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30"
                />
              </div>
            </div>
            {hasDiscount && (
              <p className="mt-2 text-sm text-gray-600">
                Diskon: {formatRupiah(discountAmount)}
                {discountType === "percent" && ` (${discountNum}%)`}
              </p>
            )}
          </section>

          {/* Totals */}
          <section className="border-t border-gray-200 pt-6 space-y-2">
            <div className="flex justify-end gap-4 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatRupiah(subtotal)}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-end gap-4 text-sm text-red-600">
                <span>Diskon:</span>
                <span className="font-medium">
                  -{formatRupiah(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-4 text-lg font-bold text-primary-pink pt-2">
              <span>Total:</span>
              <span>{formatRupiah(totalAfterDiscount)}</span>
            </div>
          </section>

          {/* Save error */}
          {saveError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}

          {/* Generate PDF */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="min-h-[48px] rounded-xl bg-primary-pink px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 disabled:opacity-60"
            >
              {generatingPdf ? "Generating PDF..." : "Generate Invoice PDF"}
            </button>
            <Link
              href="/order/list"
              className="inline-flex items-center min-h-[48px] rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
