"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"orders" | "grouped">("orders");

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
        const res = await fetch("/api/orders");
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
    router.push("/order/list/login");
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
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              viewMode === "orders"
                ? "bg-dark-blue text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Order View
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              viewMode === "grouped"
                ? "bg-dark-blue text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Grouped View
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
                          Rp {order.Total.toLocaleString("id-ID")}
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
                                Rp {cookie.Subtotal.toLocaleString("id-ID")}
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

        {/* Summary */}
        {(viewMode === "orders" ? filteredOrders.length > 0 : filteredGroupedData.length > 0) && (
          <div className="mt-6 rounded-xl bg-dark-blue p-4 text-white shadow-md sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm sm:text-base">
                {viewMode === "orders" ? (
                  <>
                    Showing {filteredOrders.length} of {orders.length} order
                    {orders.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    Showing {filteredGroupedData.length} customer
                    {filteredGroupedData.length !== 1 ? "s" : ""}
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
