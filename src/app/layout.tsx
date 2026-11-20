import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Worryless",
  description: "A spending firewall for money you can't afford to lose.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5A2A8A" };

// Current Interswitch docs: LIVE script is newwebpay.interswitchng.com, sandbox is newwebpay-sandbox.
const checkoutSrc =
  process.env.NEXT_PUBLIC_INTERSWITCH_MODE === "LIVE"
    ? "https://newwebpay.interswitchng.com/inline-checkout.js"
    : "https://newwebpay-sandbox.interswitchng.com/inline-checkout.js";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} bg-gray-100 text-slate-900 antialiased`}>
        <ToastProvider>
          <div className="mx-auto min-h-screen max-w-md bg-gray-50 shadow-sm">{children}</div>
        </ToastProvider>
        <Script src={checkoutSrc} strategy="afterInteractive" />
      </body>
    </html>
  );
}
