import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The landing page and sign-in pages are public; the app needs an account.
// API routes check the session themselves and answer 401 (instead of redirecting).
const isApp = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isApp(req)) await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files (incl. the promo video)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};
