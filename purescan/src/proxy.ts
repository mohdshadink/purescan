// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes explicitly to prevent mobile redirects/blocking
const isPublicRoute = createRouteMatcher([
    '/',
    '/api/(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) {
        return; // Skip protection for public routes
    }
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};