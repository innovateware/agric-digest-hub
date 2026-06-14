import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const googleConfigured =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET;

const passwordProvider = Password();
const provider = passwordProvider as any;
const originalAuthorize = provider.options!.authorize!;

provider.authorize = provider.options!.authorize = async (params: any, ctx: any) => {
  if (typeof params.email === "string") {
    // Repair the orphaned account if needed before retrieving it.
    await ctx.runMutation(internal.users.repairOrphanedAccount, {
      email: params.email,
    });
  }
  return await originalAuthorize(params, ctx);
};

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    passwordProvider,
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * Called whenever a user signs up or signs in via any provider.
     *
     * The default implementation can crash with:
     *   "Cannot read properties of null (reading '_id')"
     * when an authAccounts row exists but its linked users row was deleted
     * (orphaned account). This callback repairs that state by re-inserting
     * the user row and patching the account link, or simply returning the
     * existing user if they are intact.
     */
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        // User already exists — check the row is actually present in the DB.
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser !== null) {
          // Happy path: user record is intact, return as-is.
          return args.existingUserId;
        }
        // Orphaned account: the users row was deleted but authAccounts still
        // references it. Fall through to re-create the user below.
      }

      // Create a new user row (covers both fresh sign-ups and orphan recovery).
      return await ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        // emailVerificationTime and other optional fields are omitted here;
        // @convex-dev/auth will set them as needed via its own mutations.
      });
    },
  },
});

