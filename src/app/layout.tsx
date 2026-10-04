import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fredoka, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wanderpals — find your people",
  description: "Build a little you, send it into town, and it comes back with friends who are in your season of life.",
  openGraph: {
    title: "Wanderpals — find your people",
    description: "Send a little you out to find friends in your season of life.",
    images: ["/promo-poster.jpg"],
  },
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
