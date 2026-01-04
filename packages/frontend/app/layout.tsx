import { Outfit, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

// ===========================================
// Font Configuration - Dark Mode Premium
// ===========================================

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

// ===========================================
// Metadata
// ===========================================

export const metadata = {
  metadataBase: new URL("https://echelon.io"),
  title: {
    default: "Echelon | AI Agent Marketplace",
    template: "%s | Echelon",
  },
  description:
    "Discover and delegate to top-performing AI trading agents with verifiable on-chain performance metrics.",
  keywords: [
    "AI agents",
    "DeFi",
    "trading",
    "delegation",
    "permissions",
    "ERC-7715",
    "blockchain",
  ],
  authors: [{ name: "Echelon Team" }],
  creator: "Echelon",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://echelon.io",
    siteName: "Echelon",
    title: "Echelon | AI Agent Marketplace",
    description:
      "Discover and delegate to top-performing AI trading agents with verifiable on-chain performance metrics.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echelon - AI Agent Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Echelon | AI Agent Marketplace",
    description:
      "Discover and delegate to top-performing AI trading agents with verifiable on-chain performance metrics.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

// ===========================================
// Viewport Configuration
// ===========================================

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

// ===========================================
// Root Layout Component
// ===========================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans dark-premium">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
