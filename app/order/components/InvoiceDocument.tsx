"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

export interface InvoiceOrder {
  "Order ID": string;
  "Order Date": string;
  "Customer Name": string;
  WhatsApp: string;
  Address: string;
  Note: string;
  "Order Type": string;
  Total: number;
  cookieDetails: Array<{
    "Cookie Name": string;
    Size: string;
    Quantity: number;
    Subtotal: number;
  }>;
}

export interface InvoiceDiscount {
  type: "percent" | "fixed";
  value: number;
}

export interface InvoiceExtraItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#5b9ea0",
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5b9ea0",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#5b9ea0",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: "#555",
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#5b9ea0",
    color: "#fff",
    padding: 8,
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colItem: { width: "40%" },
  colSize: { width: "15%" },
  colQty: { width: "15%" },
  colSubtotal: { width: "30%", textAlign: "right" },
  totalSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#5b9ea0",
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  totalLabel: {
    fontWeight: "bold",
    marginRight: 12,
    fontSize: 11,
    minWidth: 80,
    textAlign: "right",
  },
  totalValue: {
    fontWeight: "bold",
    minWidth: 90,
    textAlign: "right",
  },
  totalValueFinal: {
    fontWeight: "bold",
    marginTop: 4,
  },
  discountRow: {
    color: "#c62828",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 12,
    backgroundColor: "#5b9ea0",
    padding: 12,
    color: "#fff",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
  },
});

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function computeDiscountAmount(
  subtotal: number,
  discount: InvoiceDiscount
): number {
  if (discount.value <= 0) return 0;
  if (discount.type === "percent")
    return Math.round((subtotal * discount.value) / 100);
  return Math.min(discount.value, subtotal);
}

export function InvoiceDocument({
  order,
  discount,
  totalAfterDiscount,
  extraItems,
  subtotalOverride,
}: {
  order: InvoiceOrder;
  discount?: InvoiceDiscount;
  totalAfterDiscount?: number;
  extraItems?: InvoiceExtraItem[];
  subtotalOverride?: number;
}) {
  const orderSubtotal = Number(order.Total);
  const extraSubtotal =
    extraItems?.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0
    ) ?? 0;
  const subtotal =
    subtotalOverride ?? orderSubtotal + extraSubtotal;
  const hasDiscount = Boolean(
    discount && discount.value > 0
  );
  const discountAmount = hasDiscount && discount
    ? computeDiscountAmount(subtotal, discount)
    : 0;
  const finalTotal =
    totalAfterDiscount ?? (hasDiscount ? subtotal - discountAmount : subtotal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image source="/cookies/logo.png" style={styles.logo} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{order["Customer Name"]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>WhatsApp:</Text>
            <Text style={styles.value}>{order.WhatsApp}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{order.Address}</Text>
          </View>
          {order.Note ? (
            <View style={styles.row}>
              <Text style={styles.label}>Note:</Text>
              <Text style={styles.value}>{order.Note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Item</Text>
              <Text style={styles.colSize}>Size</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colSubtotal}>Subtotal</Text>
            </View>
            {order.cookieDetails?.map((cookie, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colItem}>{cookie["Cookie Name"]}</Text>
                <Text style={styles.colSize}>{cookie.Size}</Text>
                <Text style={styles.colQty}>{String(cookie.Quantity)}</Text>
                <Text style={styles.colSubtotal}>
                  {formatRupiah(Number(cookie.Subtotal))}
                </Text>
              </View>
            ))}
            {extraItems?.map((item, idx) => (
              <View key={`extra-${idx}`} style={styles.tableRow}>
                <Text style={styles.colItem}>{item.name}</Text>
                <Text style={styles.colSize}>-</Text>
                <Text style={styles.colQty}>{String(item.quantity)}</Text>
                <Text style={styles.colSubtotal}>
                  {formatRupiah(item.quantity * item.unitPrice)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatRupiah(subtotal)}</Text>
            </View>
            {hasDiscount && discountAmount > 0 && (
              <View style={[styles.totalRow, styles.discountRow]}>
                <Text style={styles.totalLabel}>
                  Diskon{discount?.type === "percent" ? ` (${discount.value}%)` : ""}
                </Text>
                <Text style={styles.totalValue}>
                  -{formatRupiah(discountAmount)}
                </Text>
              </View>
            )}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue]}>
                  {formatRupiah(finalTotal)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            lineHeight: .875,
          }}>
            <Text style={{ fontWeight: "bold" }}>Pembayaran ke :</Text>
            <Text style={{ fontWeight: "400" }}>Euis Maesyaroh</Text>
            <Text style={{ fontWeight: "400" }}>639 562 6225 (BCA)</Text>
            <Text></Text>
          </View>
          <View style={styles.row}>
            <Text>Terima kasih</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
