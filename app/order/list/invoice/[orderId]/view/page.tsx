"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import { useParams } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoiceOrder,
  type InvoiceExtraItem,
  type InvoiceDiscount,
} from "../../../../components/InvoiceDocument";

interface Order {
  "Order ID": string;
  "Order Date": string;
  "Customer Name": string;
  WhatsApp: string;
  Address: string;
  Note: string;
  "Order Type": string;
  Items?: string;
  Total: number;
  "Invoice Generated"?: string;
  "Invoice Sent"?: string;
  cookieDetails: Array<{
    "Cookie Name": string;
    Size: string;
    Quantity: number;
    Subtotal: number;
  }>;
}

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function makeWhatsAppHref(number?: string, text?: string) {
  if (!number) return "#";
  let n = String(number).replace(/\D/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = `62${n.slice(1)}`; // assume Indonesia local 0 -> 62
  if (!n) return "#";
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export default function InvoiceViewPage() {
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState<string>("");
  const [invoiceSent, setInvoiceSent] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [extraItems, setExtraItems] = useState<InvoiceExtraItem[]>([]);
  const [discount, setDiscount] = useState<InvoiceDiscount | undefined>(undefined);
  const [subtotalOverride, setSubtotalOverride] = useState<number | undefined>(undefined);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [totalAfterDiscount, setTotalAfterDiscount] = useState<number | undefined>(undefined);

  const pageTitle = order
    ? `Invoice ${order["Order ID"]} — ${order["Customer Name"]}`
    : "Invoice";

  const pageDescription = order
    ? `Invoice ${order["Order ID"]} for ${order["Customer Name"]}. Total: ${formatRupiah(
        totalAfterDiscount ?? Number(order.Total)
      )}. Download at ${typeof window !== "undefined" ? window.location.origin : ""}/order/list/invoice/${order["Order ID"]}/view`
    : "View invoice details";

  useEffect(() => {
    const auth = sessionStorage.getItem("orders_list_authenticated");
    setIsAuthenticated(!!auth);
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (isCheckingAuth || !orderId) return;
    async function fetchData() {
      try {
        // 1. Try invoice sheet first (has extra items, discounts, etc.)
        const invRes = await fetch(`/api/invoice/${encodeURIComponent(orderId)}`);
        if (invRes.ok) {
          const invData = await invRes.json();
          const ord = invData.order;
          setOrder({
            "Order ID": ord["Order ID"],
            "Order Date": ord["Order Date"] || "",
            "Customer Name": ord["Customer Name"] || "",
            WhatsApp: ord.WhatsApp || "",
            Address: ord.Address || "",
            Note: ord.Note || "",
            "Order Type": ord["Order Type"] || "",
            Total: Number(ord.Total) || 0,
            cookieDetails: ord.cookieDetails || [],
          });
          setExtraItems(invData.extraItems || []);
          setDiscount(invData.discount);
          setSubtotalOverride(invData.subtotal);
          setDiscountAmount(invData.discountAmount || 0);
          setTotalAfterDiscount(invData.total);
        }

        // 2. Fetch order for Invoice Generated/Sent (from Orders sheet)
        const orderRes = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const o = orderData.order;
          setInvoiceGenerated(o["Invoice Generated"] || "");
          setInvoiceSent(o["Invoice Sent"] || "");
          // If invoice sheet wasn't found, use order data
          if (!invRes.ok) {
            const cookieDetails = orderData.cookieDetails || [];
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
              "Invoice Generated": o["Invoice Generated"],
              "Invoice Sent": o["Invoice Sent"],
              cookieDetails: cookieDetails.map((c: any) => ({
                "Cookie Name": c["Cookie Name"] || "",
                Size: c.Size || "",
                Quantity: Number(c.Quantity) || 0,
                Subtotal: Number(c.Subtotal) || 0,
              })),
            });
          }
        } else if (!invRes.ok) {
          const data = await orderRes.json().catch(() => ({}));
          setError(data.error || "Order not found");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isCheckingAuth, orderId]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    try {
      setDownloadingPdf(true);
      const blob = await pdf(
        <InvoiceDocument
          order={order as InvoiceOrder}
          extraItems={extraItems.length > 0 ? extraItems : undefined}
          discount={discount}
          subtotalOverride={subtotalOverride}
          totalAfterDiscount={totalAfterDiscount}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order["Order ID"]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error generating PDF:", e);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!order) return;
    try {
      setMarkingSent(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(order["Order ID"])}/invoice-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markSent: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to mark invoice as sent");
        return;
      }
      const d = new Date();
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      setInvoiceSent(dateStr);
        // send Telegram notification about the sent invoice
        try {
          const msg = `Invoice sent: Order #${order["Order ID"]}\nCustomer: ${order["Customer Name"]}\nTotal: ${formatRupiah(totalAfterDiscount ?? Number(order.Total))}`;
          await fetch(`/api/telegram/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
          });
        } catch (tgErr) {
          console.warn("Failed to send Telegram notification:", tgErr);
        }
    } catch (e) {
      console.error("Error marking invoice as sent:", e);
      alert("Failed to mark invoice as sent");
    } finally {
      setMarkingSent(false);
    }
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto" />
          <p className="mt-4 text-gray-600">
            {isCheckingAuth ? "Checking authentication..." : "Loading invoice..."}
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
          {isAuthenticated && (
            <Link
              href="/order/list"
              className="inline-block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90"
            >
              Back to Order List
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
      </Head>
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <img src="/cookies/logo.png" alt="Invoice Icon" />
            <h1 className="text-2xl font-bold text-dark-blue"> Invoice</h1>
            <p className="mt-1 text-sm text-gray-600">
              Order {order["Order ID"]} • Generated invoice
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/order/list"
                className="inline-block min-h-[44px] rounded-xl bg-gray-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-gray-700 text-center"
              >
                Back to List
              </Link>
              <Link
                href={`/order/list/invoice/${encodeURIComponent(order["Order ID"])}`}
                className="inline-block min-h-[44px] rounded-xl bg-dark-blue px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-dark-blue/90 text-center"
              >
                Edit Invoice
              </Link>
            </div>
          )}
        </header>

        <div className="rounded-xl bg-white p-6 shadow-md space-y-6">
          {/* Invoice status - only for logged-in users */}
          {isAuthenticated && (
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Invoice Generated:</span>
                {invoiceGenerated ? (
                  <span className="text-green-700 font-medium">{invoiceGenerated}</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Invoice Sent:</span>
                {invoiceSent ? (
                  <span className="text-green-700 font-medium">{invoiceSent}</span>
                ) : (
                  <span className="text-gray-500">Not sent</span>
                )}
              </span>
            </div>
          )}

          {/* Bill To */}
          <section>
            <h2 className="text-lg font-semibold text-dark-blue mb-3">Bill To</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span> {order["Customer Name"]}
              </div>
              <div>
                <span className="text-gray-600">WhatsApp:</span>{' '}
                {order.WhatsApp ? (
                  <a
                    href={makeWhatsAppHref(
                      order.WhatsApp,
                      `Halo ${order["Customer Name"] || ""}, invoice untuk order ${order["Order ID"]} dapat diunduh di ${typeof window !== "undefined" ? window.location.origin : ""}/order/list/invoice/${order["Order ID"]}/view`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-pink underline"
                  >
                    {order.WhatsApp}
                  </a>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
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

          {/* Payment Info */}
          <section>
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200 text-sm">
              <div className="font-semibold">Pembayaran ke :</div>
              <div>Euis Maesyaroh</div>
              <div>639 562 6225 (BCA)</div>
            </div>
          </section>
          {/* Items */}
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
                  </tr>
                </thead>
                <tbody>
                  {order.cookieDetails?.map((cookie, idx) => (
                    <tr key={idx} className="border-t border-gray-200 even:bg-gray-50">
                      <td className="py-2 px-3">{cookie["Cookie Name"]}</td>
                      <td className="py-2 px-3">{cookie.Size}</td>
                      <td className="py-2 px-3 text-right">{cookie.Quantity}</td>
                      <td className="py-2 px-3 text-right">
                        {formatRupiah(Number(cookie.Subtotal))}
                      </td>
                    </tr>
                  ))}
                  {extraItems.map((item, idx) => (
                    <tr key={`extra-${idx}`} className="border-t border-gray-200 even:bg-gray-50">
                      <td className="py-2 px-3">{item.name}</td>
                      <td className="py-2 px-3">-</td>
                      <td className="py-2 px-3 text-right">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">
                        {formatRupiah(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-1 text-right">
              {subtotalOverride != null && subtotalOverride !== Number(order.Total) && (
                <div className="text-sm text-gray-600">
                  Subtotal: {formatRupiah(subtotalOverride)}
                </div>
              )}
              {discountAmount > 0 && (
                <div className="text-sm text-red-600">
                  Diskon{discount?.type === "percent" ? ` (${discount.value}%)` : ""}: -{formatRupiah(discountAmount)}
                </div>
              )}
              <div className="text-lg font-bold text-primary-pink">
                Total: {formatRupiah(totalAfterDiscount ?? Number(order.Total))}
              </div>
            </div>
          </section>

          {/* Actions - logged-in: all buttons; not logged-in: only Download PDF */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="min-h-[48px] rounded-xl bg-primary-pink px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 disabled:opacity-60"
            >
              {downloadingPdf ? "Generating PDF..." : "Download PDF"}
            </button>
            {isAuthenticated && invoiceGenerated && !invoiceSent && (
              <button
                onClick={handleMarkAsSent}
                disabled={markingSent}
                className="min-h-[48px] rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-green-700 disabled:opacity-60"
              >
                {markingSent ? "Marking..." : "Mark Invoice as Sent"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
