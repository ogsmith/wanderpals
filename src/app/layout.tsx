import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fredoka, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });

// Absolute URLs for link previews (iMessage, WhatsApp, Slack…). Vercel sets the production domain at build time.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
const pitch = "Make a little cartoon you. It wanders around town finding friends in your stage of life — and helps plan the hangout. Free, takes 3 minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Wanderpals — find your people",
  description: pitch,
  openGraph: {
    type: "website",
    siteName: "Wanderpals",
    title: "Come be my Wanderpal 💛",
    description: pitch,
    images: [{ url: "/promo-poster.jpg", width: 1920, height: 1080, alt: "Two cartoon pals celebrating a new friendship" }],
  },
  twitter: { card: "summary_large_image", title: "Come be my Wanderpal 💛", description: pitch, images: ["/promo-poster.jpg"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/app"
          signUpFallbackRedirectUrl="/app"
          appearance={{ variables: { colorPrimary: "#ff5a36", borderRadius: "1rem" } }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
