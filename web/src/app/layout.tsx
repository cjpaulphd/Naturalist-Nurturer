import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Naturalist Nurturer",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>",
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
    statusBarStyle: "default",
    title: "Naturalist Nurturer",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Header />
        <main className="flex-1">{children}</main>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
