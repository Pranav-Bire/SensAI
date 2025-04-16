import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/resume(.*)',
  '/ai-cover-letter(.*)',
  '/interview(.*)',
  '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Handle public routes
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  // If user is not authenticated, redirect to sign-in
  if (!userId) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  try {
    // Check if user has completed onboarding using API instead of direct Prisma access
    const onboardingStatus = await fetch(new URL("/api/user/onboarding-status", req.url), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    }).then(res => res.json());

    // If API indicates error or user doesn't exist
    if (onboardingStatus.error) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If user hasn't completed onboarding
    if (!onboardingStatus.completed) {
      // If trying to access any protected route except onboarding, redirect to onboarding
      if (!req.nextUrl.pathname.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    } else {
      // If user has completed onboarding and tries to access onboarding page
      if (req.nextUrl.pathname.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};