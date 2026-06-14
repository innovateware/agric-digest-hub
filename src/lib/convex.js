import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Run `npx convex dev` and add the URL to .env.local"
  );
}

export const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");
