"use client";

/** Browser-only helper that opens the Interswitch inline checkout popup. */
export type CheckoutResponse = { resp?: string; desc?: string; [key: string]: unknown };

declare global {
  interface Window {
    webpayCheckout?: (request: Record<string, unknown>) => void;
  }
}

export function openInterswitchCheckout(args: {
  txnRef: string;
  amountKobo: number;
  email: string;
  name: string;
  onComplete: (response: CheckoutResponse) => void;
}): boolean {
  if (typeof window === "undefined" || !window.webpayCheckout) return false; // script not loaded yet

  window.webpayCheckout({
    merchant_code: process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE,
    pay_item_id: process.env.NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID,
    pay_item_name: "Worryless wallet funding",
    txn_ref: args.txnRef,
    amount: args.amountKobo, // kobo
    currency: 566, // NGN
    cust_email: args.email,
    cust_name: args.name,
    site_redirect_url: `${window.location.origin}/dashboard`,
    onComplete: args.onComplete,
    mode: process.env.NEXT_PUBLIC_INTERSWITCH_MODE === "LIVE" ? "LIVE" : "TEST",
  });
  return true;
}
