export type OrderTypeOption = "single" | "hampers";

export type SizeOption = "400ml" | "600ml" | "800ml";

export interface CustomerData {
  name: string;
  whatsapp: string;
  address: string;
  note: string;
}

export interface CookieProduct {
  id: string;
  name: string;
  image: string;
  basePrice: number;
  sizePrices: Record<string, number>;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  size: SizeOption;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderState {
  orderId: string;
  orderDate: string;
  customer: CustomerData;
  orderType: OrderTypeOption;
  items: OrderItem[];
  total: number;
}
