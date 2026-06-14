/** Set VITE_ENABLE_GOOGLE_AUTH=true after configuring AUTH_GOOGLE_ID/SECRET on Convex. */
export const googleAuthEnabled =
  import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";
