/** Public display strings only; no credentials or server-only data. */
export const statusMessages = {
  submitted: { bn: "আপনার পেমেন্ট যাচাইয়ের অপেক্ষায় আছে", en: "Your payment is awaiting manual verification." },
  verified: { bn: "পেমেন্ট যাচাই হয়েছে, ডেলিভারির প্রস্তুতি চলছে", en: "Payment verified; preparing delivery." },
  delivered: { bn: "ডেলিভারি সম্পন্ন হয়েছে", en: "Delivery completed." },
  rejected: { bn: "পেমেন্ট দাবি গ্রহণ করা হয়নি, WhatsApp-এ যোগাযোগ করুন", en: "Payment claim rejected. Please contact us on WhatsApp." },
  refunded: { bn: "অর্থ ফেরত দেওয়া হয়েছে", en: "Refund completed." },
} as const;
export type TrackingView = { orderCode: string; status: keyof typeof statusMessages; productName: string; amountExpected: number; createdAt: string; message: { bn: string; en: string } };
