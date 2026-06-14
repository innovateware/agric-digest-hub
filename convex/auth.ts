import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const googleConfigured =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET;

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password,
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
});
