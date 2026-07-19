import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Naturalist Nurturer",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>",
    apple: "/icons/icon-192.png",
  },
  description:
    "Know Your Neighbors. Learn the species where you are with flashcards and quizzes powered by iNaturalist.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.natnurturer.org"),
  openGraph: {
    title: "Naturalist Nurturer",
    description:
      "Know Your Neighbors. Learn the species where you are with flashcards and quizzes powered by iNaturalist.",
    url: "https://www.natnurturer.org",
    siteName: "Naturalist Nurturer",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Naturalist Nurturer",
    description:
      "Know Your Neighbors. Learn the species where you are with flashcards and quizzes powered by iNaturalist.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Naturalist Nurturer",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <div
          className="sticky top-0 z-50 bg-green-800"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Header />
        </div>
        <main className="flex-1">{children}</main>
        {/* Shown only on phone-sized touch screens in landscape (see globals.css) */}
        <div className="rotate-overlay" role="status">
          <span className="text-4xl" aria-hidden="true">
            📱
          </span>
          <p className="font-semibold">Please rotate your device</p>
          <p className="text-sm text-green-100">
            Naturalist Nurturer is designed for portrait mode.
          </p>
        </div>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
