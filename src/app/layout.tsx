import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { InfoWidget } from "@/components/InfoWidget";
import { PostHogProviderClient } from "@/providers/posthog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Open Metropolitan - Explore The Met's Art Collection",
  description: "Discover and explore artworks from The Metropolitan Museum of Art collection through an interactive visual galaxy. Navigate thousands of masterpieces in a unique, immersive experience.",
  keywords: "Metropolitan Museum, Met Museum, art collection, interactive art, visual exploration, art gallery, masterpieces, cultural heritage",
  authors: [{ name: "Open Metropolitan" }],
  creator: "Open Metropolitan",
  publisher: "Open Metropolitan",
  
  // Open Graph tags for social media sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.openmetropolitan.com",
    siteName: "Open Metropolitan",
    title: "Open Metropolitan - Explore The Met's Art Collection",
    description: "Discover and explore artworks from The Metropolitan Museum of Art collection through an interactive visual galaxy.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Open Metropolitan - Interactive Art Explorer",
      },
    ],
  },
  
  // Twitter Card tags
  twitter: {
    card: "summary_large_image",
    title: "Open Metropolitan - Explore The Met's Art Collection",
    description: "Discover artworks from The Met through an interactive visual galaxy.",
    images: ["/og-image.png"],
    creator: "@openmetropolitan",
  },
  
  // Favicon configuration with multiple sizes
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Additional meta tags
  metadataBase: new URL("https://www.openmetropolitan.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body className={`font-sans ${inter.variable} ${playfair.variable}`}>
        <PostHogProviderClient>
          {children}
          <InfoWidget />
        </PostHogProviderClient>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Open Metropolitan",
              description: "Explore The Metropolitan Museum of Art collection through an interactive visual galaxy",
              url: "https://www.openmetropolitan.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.openmetropolitan.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              publisher: {
                "@type": "Organization",
                name: "Open Metropolitan",
                logo: {
                  "@type": "ImageObject",
                  url: "https://www.openmetropolitan.com/apple-touch-icon.png"
                }
              },
              sameAs: [
                "https://twitter.com/openmetropolitan",
                "https://github.com/openmetropolitan"
              ]
            }),
          }}
        />
      </body>
    </html>
  );
}
