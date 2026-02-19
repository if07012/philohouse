"use client";

interface OrderInfoProps {
  orderId: string;
  orderDate: string;
}

export default function OrderInfo({ orderId, orderDate }: OrderInfoProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-dark-blue sm:text-lg">
        Informasi Pesanan
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-600">
            ID Pesanan
          </label>
          <p className="mt-1 rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm text-gray-800">
            {orderId}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Tanggal Pesanan
          </label>
          <p className="mt-1 rounded-lg bg-gray-100 px-3 py-2 text-gray-800">
            {orderDate}
          </p>
        </div>
      </div>
    </div>
  );
}
