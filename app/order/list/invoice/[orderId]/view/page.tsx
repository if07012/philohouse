import type { Metadata } from "next";
import {
  getInvoiceByOrderId,
  getOrderByOrderId,
  getBaseUrl,
} from "../../../../lib/invoiceServer";
import InvoiceViewClient, {
  type InitialInvoiceData,
} from "./InvoiceViewClient";

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type Props = {
  params: Promise<{ orderId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderId } = await params;
  if (!orderId) {
    return { title: "Invoice" };
  }

  const invoiceData = await getInvoiceByOrderId(orderId);
  const orderData = await getOrderByOrderId(orderId);

  const order = invoiceData?.order ?? orderData;
  if (!order) {
    return { title: "Invoice" };
  }

  const total =
    invoiceData?.discountAmount && invoiceData.discountAmount > 0
      ? invoiceData.total
      : invoiceData?.total ?? Number(order.Total);
  const title =
    invoiceData?.discountAmount && invoiceData.discountAmount > 0
      ? `Invoice ${order["Order ID"]} — ${order["Customer Name"]} — ${formatRupiah(total)}`
      : `Invoice ${order["Order ID"]} — ${order["Customer Name"]}`;
  const description = `Invoice ${order["Order ID"]} untuk ${order["Customer Name"]}. Total: ${formatRupiah(total)}.`;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/order/list/invoice/${orderId}/view`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Philihouse.id",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function InvoiceViewPage({ params }: Props) {
  const { orderId } = await params;

  let initialData: InitialInvoiceData | null = null;

  const invoiceData = await getInvoiceByOrderId(orderId);
  const orderData = await getOrderByOrderId(orderId);

  if (invoiceData) {
    initialData = {
      order: invoiceData.order,
      extraItems: invoiceData.extraItems,
      discount: invoiceData.discount,
      subtotalOverride: invoiceData.subtotal,
      discountAmount: invoiceData.discountAmount,
      totalAfterDiscount: invoiceData.total,
      invoiceGenerated: orderData?.["Invoice Generated"],
      invoiceSent: orderData?.["Invoice Sent"],
    };
  } else if (orderData) {
    initialData = {
      order: {
        "Order ID": orderData["Order ID"],
        "Order Date": orderData["Order Date"] || "",
        "Customer Name": orderData["Customer Name"] || "",
        WhatsApp: orderData.WhatsApp || "",
        Address: orderData.Address || "",
        Note: orderData.Note || "",
        "Order Type": orderData["Order Type"] || "",
        Total: Number(orderData.Total) || 0,
        "Invoice Generated": orderData["Invoice Generated"],
        "Invoice Sent": orderData["Invoice Sent"],
        cookieDetails: orderData.cookieDetails || [],
      },
      extraItems: [],
      discountAmount: 0,
      totalAfterDiscount: Number(orderData.Total) || 0,
      invoiceGenerated: orderData["Invoice Generated"],
      invoiceSent: orderData["Invoice Sent"],
    };
  }

  return <InvoiceViewClient initialData={initialData} />;
}
