import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { FractalWidget } from "@/components/FractalWidget";
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
  title: "Open Metropolitan",
  description: "Visualize all the METs data",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} ${playfair.variable}`}>
        <PostHogProviderClient>
          {children}
          <InfoWidget />
        </PostHogProviderClient>
      </body>
    </html>
  );
}
