# Worryless

A behavioral escrow wallet for lump-sum recipients in Nigeria. Every naira has a state:
free to spend (green), locked for a purpose (slate), or frozen for security (red).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + lucide-react + Supabase (Postgres + Auth) + Prisma.

## Setup

1. **Create a Supabase project.** In Authentication > Providers > Email, turn off "Confirm email" while developing.
2. **Environment:** `cp .env.example .env.local` and fill it in.
   - `DATABASE_URL` = pooler string (port 6543, `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` = direct string (port 5432), used by Prisma for schema changes
3. **Install and create tables:**
   ```bash
   npm install
   npx prisma db push
   ```
4. **Apply Row Level Security:** in Supabase > SQL Editor run `supabase/migrations/0001_rls.sql`, then `0002_funding_rls.sql`
   (after step 3, because Prisma creates the tables).
5. **Run:** `npm run dev`, open http://localhost:3000, create an account.

If you already ran the first version: pull in the new files, run `npm install` and `npx prisma db push` again
(it adds the `WalletFunding` table), then run `0002_funding_rls.sql`.

## Fund Wallet (Interswitch inline checkout)

Flow: sheet -> `POST /api/wallet/fund/init` (creates a unique `txnRef`) -> Interswitch popup ->
on `resp === "00"` -> `POST /api/wallet/fund/verify`, which asks Interswitch's `gettransaction.json`
directly and checks the response code and the amount. **Only that server check credits the wallet**,
and a unique `txnRef` means one payment can credit only once.

- `.env.example` is set to `NEXT_PUBLIC_INTERSWITCH_MODE=LIVE` with the hackathon merchant code and pay item id.
  **LIVE charges real cards.** Use small amounts (minimum is ₦10), or switch to `TEST` with sandbox credentials.
- Script URLs follow the current Interswitch docs: LIVE `https://newwebpay.interswitchng.com/inline-checkout.js`,
  sandbox `https://newwebpay-sandbox.interswitchng.com/inline-checkout.js` (chosen in `src/app/layout.tsx`).
- Interswitch's docs note that some merchant setups require a `Hash` header on the `gettransaction.json` requery.
  If verification returns "could not confirm" for a payment that went through, check your Developer Console
  and add that header in `PaymentService.verifyFunding()`.
- If the popup closes before the verify call finishes, the money is not lost: the funding row stays PENDING.
  A webhook or a "recheck pending payments" job is the next thing to add.
- Airtime and Send are **test mode**: they debit your available balance and write a notification, but no real
  payout happens until you wire Interswitch Payout/VAS into `PaymentService`.

## Try the flow

1. Home > Fund Wallet, add a small amount.
2. "Use this template" to create Food / Transport / Airtime / Emergency envelopes at ₦0.
3. Open an envelope, "Lock money here" to move money out of your available balance.
4. "Release early" resets your discipline score. The heartbeat pill above the nav confirms you are active.
5. Group tab: create a group, invite someone who has already signed up, contribute, request a release, approve.

## Cron routes (mocked scheduler)

```bash
curl -X POST http://localhost:3000/api/cron/heartbeat -H "x-cron-secret: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/disburse  -H "x-cron-secret: $CRON_SECRET"
```

- `heartbeat`: freezes users inactive for 7+ days and pauses their schedules.
- `disburse`: runs schedules due now, deducts the envelope, advances `nextRunAt`, +2 discipline score;
  insufficient balance marks the schedule FAILED and creates a notification.

To test a freeze, set a user's `lastActiveAt` to 8 days ago in Supabase's table editor, then call the heartbeat route.

## Project map

```
prisma/schema.prisma                  data model (incl. WalletFunding)
supabase/migrations/                  RLS policies
src/app/layout.tsx                    font + Interswitch script
src/app/(app)/layout.tsx              shared shell: heartbeat pill, frozen overlay, bottom nav
src/app/(app)/dashboard|envelopes|groups|profile
src/components/                       BottomNav, HeartbeatBar, FrozenOverlay, QuickActions (sheets + toast)
src/lib/payment/PaymentService.ts     server: verifyFunding (real) + mocked payouts
src/lib/payment/interswitch-client.ts browser: opens the checkout popup
src/app/api/wallet/*                  fund init/verify, spend
src/app/api/cron/*                    heartbeat + disburse engines
```

## Notes and known limits

- Prisma connects as the database owner, so it bypasses RLS; RLS protects the Supabase client API. The app checks ownership in code.
- `Schedule.status` (ACTIVE | PAUSED | FAILED) replaces the `active` boolean.
- Amounts are `Int` kobo (max about ₦21 million per balance). Move to `BigInt` if you need more.
- BVN check is mocked (any 4 digits pass).
- Group votes are not locked against simultaneous clicks; add row locking before handling real group money.
- Supabase free projects pause when idle. Wake yours before a demo.
