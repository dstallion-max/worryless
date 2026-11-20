/**
 * All money movement goes through here. Never store card data in this app.
 *
 * - Wallet funding is REAL: the browser opens Interswitch inline checkout
 *   (see interswitch-client.ts), then the server confirms the payment with
 *   verifyFunding() before any balance is credited.
 * - Payouts (disburseToBank / buyAirtime / disburse) are still MOCKED and return success.
 *   Replace their bodies with Interswitch Payout Channels / VAS calls when you are ready.
 */
export type PaymentResult = { ok: boolean; reference: string; message?: string };

export type DisburseArgs = {
  recipientType: "AIRTIME" | "BANK";
  recipientRef: string;
  bankName?: string | null;
  bankCode?: string | null;
  accountName?: string | null;
  amountKobo: number;
};

export type FundingVerification = {
  status: "SUCCESS" | "FAILED" | "UNREACHABLE";
  message?: string;
};

const ref = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class PaymentService {
  get mode(): "LIVE" | "TEST" {
    return process.env.NEXT_PUBLIC_INTERSWITCH_MODE === "LIVE" ? "LIVE" : "TEST";
  }

  /** Server-side requery. Credit the wallet ONLY when this returns SUCCESS. */
  async verifyFunding(args: { txnRef: string; amountKobo: number }): Promise<FundingVerification> {
    const merchant = process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE;
    if (!merchant) return { status: "UNREACHABLE", message: "Merchant code is not configured." };

    const base = this.mode === "LIVE" ? "https://webpay.interswitchng.com" : "https://sandbox.interswitchng.com";
    const url =
      `${base}/collections/api/v1/gettransaction.json` +
      `?merchantcode=${encodeURIComponent(merchant)}` +
      `&transactionreference=${encodeURIComponent(args.txnRef)}` +
      `&amount=${args.amountKobo}`;

    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
      if (!res.ok) return { status: "UNREACHABLE", message: `Interswitch returned HTTP ${res.status}.` };

      const body = (await res.json()) as Record<string, unknown>;
      const code = String(body.ResponseCode ?? body.responseCode ?? "");
      const paidKobo = Number(body.Amount ?? body.amount);
      const desc = String(body.ResponseDescription ?? body.responseDescription ?? "");

      if (code === "00" && paidKobo === args.amountKobo) return { status: "SUCCESS" };
      if (code === "00") return { status: "FAILED", message: "Paid amount does not match the amount requested." };
      return { status: "FAILED", message: desc || `Payment not completed (code ${code || "unknown"}).` };
    } catch {
      return { status: "UNREACHABLE", message: "Could not reach Interswitch to confirm the payment." };
    }
  }

  async disburseToBank(args: {
    accountRef: string;
    bankCode?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    amountKobo: number;
    narration?: string;
  }): Promise<PaymentResult> {
    // TODO: Interswitch Payout Channels transfer (needs accountRef + bankCode).
    void args;
    return { ok: true, reference: ref("PAYOUT") };
  }

  async buyAirtime(args: { phone: string; amountKobo: number }): Promise<PaymentResult> {
    // TODO: Interswitch VAS airtime purchase.
    void args;
    return { ok: true, reference: ref("AIRTIME") };
  }

  /** Routes a schedule's recipient to the right channel. */
  async disburse(args: DisburseArgs): Promise<PaymentResult> {
    return args.recipientType === "AIRTIME"
      ? this.buyAirtime({ phone: args.recipientRef, amountKobo: args.amountKobo })
      : this.disburseToBank({
          accountRef: args.recipientRef,
          bankCode: args.bankCode,
          bankName: args.bankName,
          accountName: args.accountName,
          amountKobo: args.amountKobo,
          narration: "Worryless scheduled release",
        });
  }
}

export const paymentService = new PaymentService();
