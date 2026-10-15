export type OrderStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "delivered"
  | "rejected"
  | "refunded";
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  pricePoisha: number;
  unit: string;
  duration: string;
  icon: "setup" | "prompt" | "chatbot" | "website";
  includes: string[];
  deliveryType: "service";
  deliveryMethod: string;
  deliveryNote: string;
  terms: string;
  active: boolean;
};
export type PublicOrder = {
  orderCode: string;
  productName: string;
  amountPoisha: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  deliveredAt: string | null;
  customerMessage: string;
};
export type AdminOrder = PublicOrder & {
  id: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  whatsapp: string | null;
  bkashSender: string;
  trxId: string | null;
  version: number;
  bkashRecipient?: string;
  paymentMethod?: string;
  productSnapshot?: Product;
  legacyAdminNote?: string | null;
};
export const statusLabels: Record<OrderStatus, string> = {
  pending: "পেমেন্ট দাবি জমা হয়নি",
  submitted: "পেমেন্ট যাচাইয়ের অপেক্ষায়",
  verified: "পেমেন্ট যাচাই হয়েছে",
  delivered: "সেবা দেওয়া হয়েছে",
  rejected: "পেমেন্ট দাবি গ্রহণ হয়নি",
  refunded: "অর্থ ফেরত দেওয়া হয়েছে",
};
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (
    (from === "submitted" && (to === "verified" || to === "rejected")) ||
    (from === "verified" && to === "delivered")
  );
}
