"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildTelegramOrderMessage } from "../data/cookies";

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
// Client-side env vars must be prefixed with NEXT_PUBLIC_ to be exposed to the browser
const WHATSAPP_NUMBER: Record<string, string | undefined> = {
  "Cindy": process.env.NEXT_PUBLIC_SALES_WA,
};
export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"orders" | "grouped" | "groupedWhatsApp">("orders");

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem("orders_list_authenticated");
    if (!isAuthenticated) {
      router.push("/order/list/login");
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    // Only fetch orders if authenticated
    if (isCheckingAuth) return;

    async function fetchOrders() {
      try {
        // Send username/role/sales from sessionStorage so the server can filter for sales users
        const username = sessionStorage.getItem("orders_list_username") || "";
        const role = sessionStorage.getItem("orders_list_role") || "";
        const salesId = sessionStorage.getItem("orders_list_sales") || "";

        const res = await fetch("/api/orders", {
          headers: {
            "x-orders-username": username,
            "x-orders-role": role,
            "x-orders-sales": salesId,
          },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load orders");
          return;
        }
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [isCheckingAuth]);

  const handleLogout = () => {
    sessionStorage.removeItem("orders_list_authenticated");
    sessionStorage.removeItem("orders_list_username");
    sessionStorage.removeItem("orders_list_role");
    sessionStorage.removeItem("orders_list_sales");
    router.push("/order/list/login");
  };

  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);

  const sendOrderToTelegram = async (orderId: string) => {
    try {
      setSendingOrderId(orderId);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to fetch order details");
        return;
      }
      const data = await res.json();
      const order = data.order;
      const cookieDetails = data.cookieDetails || [];
      const gifts: string[] = data.gifts || [];

      const items = (cookieDetails || []).map((c: any) => ({
        name: c['Cookie Name'] || c["Cookie Name"],
        size: c.Size || c.Size || "",
        quantity: Number(c.Quantity) || 0,
        subtotal: Number(c.Subtotal) || 0,
      }));

      const orderPayload = {
        orderId: order['Order ID'] || order["Order ID"],
        orderDate: order['Order Date'] || order["Order Date"] || "",
        customer: {
          name: order['Customer Name'] || order["Customer Name"] || "",
          whatsapp: order.WhatsApp || order.WhatsApp || "",
          address: order.Address || order.Address || "",
          note: order.Note || order.Note || "",
          sales: order['Sales'] || order.Sales || "",
        },
        orderType: (order['Order Type'] || order['Order Type'] || "").toLowerCase().includes("single") ? "single" : "hampers",
        items,
        total: Number(order.Total) || 0,
        gifts: gifts.length > 0 ? gifts : undefined,
        salesWhatsapp: WHATSAPP_NUMBER[order['Sales'] || order.Sales || ""]
      };

      console.log("Order payload for Telegram:", orderPayload);
      console.log("WhatsApp number for sales:", WHATSAPP_NUMBER);
      const message = buildTelegramOrderMessage(orderPayload as any);
      const sendRes = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        alert(err.error || "Failed to send Telegram message");
      } else {
        alert("Telegram message sent");
      }
    } catch (e) {
      console.error("Error sending to Telegram:", e);
      alert("Error sending to Telegram");
    } finally {
      setSendingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order["Order ID"].toLowerCase().includes(search) ||
      order["Customer Name"].toLowerCase().includes(search) ||
      order.WhatsApp.toLowerCase().includes(search) ||
      order.Address.toLowerCase().includes(search)
    );
  });

  // Group orders by cookie name, size, then customer
  interface CookieGroupData {
    cookieName: string;
    size: string;
    items: {
      customerName: string;
      quantity: number;
      size: string;
      customerInfo: {
        whatsapp: string;
        address: string;
      };
    }[];
  }

  const groupedData = filteredOrders.reduce((acc, order) => {
    const customerName = order["Customer Name"];
    const customerInfo = {
      whatsapp: order.WhatsApp,
      address: order.Address,
    };

    // Group by cookie name and size
    order.cookieDetails.forEach((cookie) => {
      const cookieName = cookie["Cookie Name"];
      const size = cookie.Size;
      const key = `${cookieName}_${size}`;

      if (!acc[key]) {
        acc[key] = {
          cookieName,
          size,
          items: [],
        };
      }

      // Check if customer already exists for this cookie/size combo
      const existingCustomer = acc[key].items.find(
        (item) => item.customerName === customerName
      );

      if (existingCustomer) {
        existingCustomer.quantity += parseInt(cookie.Quantity.toString());
      } else {
        acc[key].items.push({
          customerName,
          quantity: parseInt(cookie.Quantity.toString()),
          size: size,
          customerInfo,
        });
      }
    });

    return acc;
  }, {} as Record<string, CookieGroupData>);

  // Convert to array format and sort
  const groupedArray: CookieGroupData[] = Object.values(groupedData)
    .map((group) => ({
      ...group,
      // Sort items within each group by customer name
      items: group.items.sort((a, b) =>
        a.customerName.localeCompare(b.customerName)
      ),
    }))
    .sort((a, b) => {
      // Sort groups by cookie name first, then by size
      if (a.cookieName !== b.cookieName) {
        return a.cookieName.localeCompare(b.cookieName);
      }
      return a.size.localeCompare(b.size);
    });

  // Filter grouped data by search term
  const filteredGroupedData = groupedArray.filter((group) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      group.cookieName.toLowerCase().includes(search) ||
      group.size.toLowerCase().includes(search) ||
      group.items.some(
        (item) =>
          item.customerName.toLowerCase().includes(search) ||
          item.customerInfo.whatsapp.toLowerCase().includes(search) ||
          item.customerInfo.address.toLowerCase().includes(search)
      )
    );
  });

  // Group by cookie name + WhatsApp number
  const groupedWhatsAppData = filteredOrders.reduce((acc, order) => {
    const customerName = order["Customer Name"];
    const whatsapp = order.WhatsApp || "";

    order.cookieDetails.forEach((cookie) => {
      const cookieName = cookie["Cookie Name"];
      const key = `${whatsapp}`;
      if (!acc[key]) {
        acc[key] = {
          whatsapp,
          items: [],
        };
      }

      const existing = acc[key].items.find((it: any) => it.customerName === customerName && it.size === cookie.Size);
      if (existing) {
        existing.quantity += parseInt(cookie.Quantity.toString());
      } else {
        acc[key].items.push({
          customerName,
          quantity: parseInt(cookie.Quantity.toString()),
          size: cookie.Size,
          cookieName:cookieName,
          customerInfo: { whatsapp, address: order.Address },
        });
      }
    });

    return acc;
  }, {} as any);
  const groupedWhatsAppArray = Object.values(groupedWhatsAppData)
    .map((g: any) => ({
      ...g,
      items: g.items.sort((a: any, b: any) => a.customerName.localeCompare(b.customerName)),
    }))
    .sort((a: any, b: any) => {
      if (a.cookieName !== b.cookieName) return a.cookieName.localeCompare(b.cookieName);
      return a.whatsapp.localeCompare(b.whatsapp);
    });

  const filteredGroupedWhatsAppData = groupedWhatsAppArray.filter((group) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      group.whatsapp.toLowerCase().includes(search) ||
      group.items.some((item: any) =>
        item.customerName.toLowerCase().includes(search) ||
        item.customerInfo.whatsapp.toLowerCase().includes(search) ||
        item.customerInfo.address.toLowerCase().includes(search)
      )
    );
  });
  const resultsCount = viewMode === "orders" ? filteredOrders.length : viewMode === "grouped" ? filteredGroupedData.length : filteredGroupedWhatsAppData.length;
  const totalCount = viewMode === "orders" ? orders.length : viewMode === "grouped" ? groupedArray.length : groupedWhatsAppArray.length;
  console.log(filteredGroupedWhatsAppData)
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-dark-blue mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-dark-blue sm:text-3xl">
                All Orders
              </h1>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">
                View all customer orders and their cookie selections
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/order"
                className="inline-block min-h-[44px] rounded-xl bg-primary-pink px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg"
              >
                New Order
              </Link>
              <button
                onClick={handleLogout}
                className="inline-block min-h-[44px] rounded-xl bg-gray-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-gray-700 hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* View Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode("orders")}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${viewMode === "orders"
              ? "bg-dark-blue text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
          >
            Order View
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${viewMode === "grouped"
              ? "bg-dark-blue text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
          >
            Grouped View
          </button>
          <button
            onClick={() => setViewMode("groupedWhatsApp")}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${viewMode === "groupedWhatsApp"
              ? "bg-dark-blue text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
          >
            Grouped by WhatsApp
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              viewMode === "orders"
                ? "Search by Order ID, Customer Name, WhatsApp, or Address..."
                : "Search by Customer Name, WhatsApp, Address, or Cookie Name..."
            }
            className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base placeholder-gray-400 focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
          />
        </div>

        {/* Orders List */}
        {viewMode === "orders" && (
          filteredOrders.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-500 sm:text-base">
                {searchTerm
                  ? "No orders found matching your search."
                  : "No orders found."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order["Order ID"]}
                  className="rounded-xl bg-white p-4 shadow-md sm:p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold text-dark-blue">
                            Order {order["Order ID"]}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {order["Order Date"]} • {order["Order Type"]}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-pink">
                            Rp {parseInt(order.Total.toString()).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">
                            Customer:
                          </span>{" "}
                          <span className="text-gray-800">{order["Customer Name"]}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            WhatsApp:
                          </span>{" "}
                          <a
                            href={`https://wa.me/${order.WhatsApp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-pink hover:underline"
                          >
                            {order.WhatsApp}
                          </a>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-medium text-gray-600">
                            Address:
                          </span>{" "}
                          <span className="text-gray-800">{order.Address}</span>
                        </div>
                        {order.Note && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-gray-600">
                              Note:
                            </span>{" "}
                            <span className="text-gray-800">{order.Note}</span>
                          </div>
                        )}
                      </div>

                      {/* Cookie Details */}
                      {order.cookieDetails && order.cookieDetails.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-semibold text-dark-blue mb-2">
                            Cookies Ordered:
                          </h3>
                          <div className="space-y-1">
                            {order.cookieDetails.map((cookie, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-sm"
                              >
                                <span className="text-gray-700">
                                  {cookie["Cookie Name"]} ({cookie.Size}) ×{" "}
                                  {cookie.Quantity}
                                </span>
                                <span className="font-medium text-gray-800">
                                  Rp {parseInt(cookie.Subtotal.toString()).toLocaleString("id-ID")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:min-w-[120px]">
                      <Link
                        href={`/order/edit/${order["Order ID"]}`}
                        className="min-h-[44px] rounded-lg bg-dark-blue px-4 py-2 text-sm font-medium text-white text-center transition-colors hover:bg-dark-blue/90"
                      >
                        Edit Order
                      </Link>
                      <button
                        onClick={() => sendOrderToTelegram(order["Order ID"])}
                        disabled={sendingOrderId === order["Order ID"]}
                        className="min-h-[44px] mt-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white text-center transition-colors hover:bg-green-700 disabled:opacity-60"
                      >
                        {sendingOrderId === order["Order ID"] ? "Sending..." : "Send to Telegram"}
                      </button>
                      <Link
                        href={`/order/list/invoice/${encodeURIComponent(order["Order ID"])}`}
                        className="min-h-[44px] mt-2 rounded-lg bg-primary-pink px-4 py-2 text-sm font-medium text-white text-center transition-colors hover:bg-primary-pink/90 block"
                      >
                        Generate Invoice
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        {viewMode === "grouped" && (
          // Grouped View
          filteredGroupedData.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-500 sm:text-base">
                {searchTerm
                  ? "No data found matching your search."
                  : "No data found."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroupedData.map((group, groupIdx) => (
                <div
                  key={groupIdx}
                  className="rounded-xl bg-white p-4 shadow-md sm:p-6"
                >
                  <h2 className="text-xl font-bold text-dark-blue mb-4">
                    {group.cookieName} - {group.size}
                  </h2>

                  <div className="space-y-2">
                    {group.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 flex items-center gap-4">
                          <span className="text-gray-600 min-w-[100px]">
                            {item.quantity} item{item.quantity !== 1 ? "s" : ""}
                          </span>
                          <span className="font-medium text-gray-800 flex-1">
                            {item.customerName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {viewMode === "groupedWhatsApp" && (
          filteredGroupedWhatsAppData.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-500 sm:text-base">
                {searchTerm
                  ? "No data found matching your search."
                  : "No data found."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroupedWhatsAppData.map((group: any, groupIdx: number) => (
                <div
                  key={groupIdx}
                  className="rounded-xl bg-white p-4 shadow-md sm:p-6"
                >
                  <h2 className="text-xl font-bold text-dark-blue mb-4">
                    {group.whatsapp} - {group.items[0]?.customerName}
                  </h2>
                  <div className="text-sm text-gray-600 mb-4">
                    {group.items[0]?.customerInfo?.address}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item: any, itemIdx: number) => (
                      <div
                        key={itemIdx}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 flex items-center gap-4">
                          <span className="text-gray-600 min-w-[100px]">
                            {item.quantity} item{item.quantity !== 1 ? "s" : ""}
                          </span>
                          <span className="font-medium text-gray-800 flex-1">
                            {item.cookieName} - {item.size}
                          </span>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Summary */}
        {resultsCount > 0 && (
          <div className="mt-6 rounded-xl bg-dark-blue p-4 text-white shadow-md sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm sm:text-base">
                {viewMode === "orders" ? (
                  <>
                    Showing {resultsCount} of {totalCount} order{totalCount !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    Showing {resultsCount} of {totalCount} group{totalCount !== 1 ? "s" : ""}
                  </>
                )}
              </p>
              <p className="text-lg font-bold">
                Total Revenue: Rp{" "}
                {filteredOrders
                  .reduce((sum, order) => sum + parseInt(order.Total.toString()), 0)
                  .toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
