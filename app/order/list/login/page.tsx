"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Store auth and role in sessionStorage
      sessionStorage.setItem("orders_list_authenticated", "true");
      sessionStorage.setItem("orders_list_username", username);
      if (data.role) {
        sessionStorage.setItem("orders_list_role", data.role);
      }
      if (data.salesId) {
        sessionStorage.setItem("orders_list_sales", data.salesId);
      }

      // Redirect to orders list
      router.push("/order/list");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-dark-blue sm:text-3xl">
            Orders List Login
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the orders list
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-primary-pink focus:outline-none focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/order"
            className="text-sm font-medium text-primary-pink hover:underline"
          >
            Back to Order Form
          </a>
        </div>
      </div>
    </div>
  );
}
