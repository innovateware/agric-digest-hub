import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getUserProfile(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireAuth(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function requireRole(
  ctx: Ctx,
  roles: Array<"admin" | "data_entry" | "viewer">
) {
  const userId = await requireAuth(ctx);
  const profile = await getUserProfile(ctx, userId);
  const role = profile?.role ?? "viewer";
  if (!roles.includes(role)) {
    throw new Error("Forbidden");
  }
  return { userId, profile, role };
}

export async function getCurrentUserEmail(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.email ?? "";
}
