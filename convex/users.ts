import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserProfile } from "./lib/permissions";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    const profile = await getUserProfile(ctx, userId);

    return {
      id: userId,
      email: identity?.email ?? "",
      full_name: profile?.name ?? identity?.name ?? "",
      role: profile?.role ?? "viewer",
    };
  },
});

export const ensureProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const existing = await getUserProfile(ctx, userId);
    if (existing) {
      return existing._id;
    }

    const identity = await ctx.auth.getUserIdentity();
    const profileCount = await ctx.db.query("userProfiles").collect();

    return await ctx.db.insert("userProfiles", {
      userId,
      role: profileCount.length === 0 ? "admin" : "viewer",
      name: args.name ?? identity?.name ?? undefined,
    });
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("data_entry"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentProfile = await getUserProfile(ctx, currentUserId);
    if (currentProfile?.role !== "admin") {
      throw new Error("Forbidden");
    }

    const profile = await getUserProfile(ctx, args.userId);
    if (!profile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(profile._id, { role: args.role });
  },
});

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const profile = await getUserProfile(ctx, userId);
    if (profile?.role !== "admin") {
      return [];
    }

    const profiles = await ctx.db.query("userProfiles").collect();
    const results = [];

    for (const p of profiles) {
      const user = await ctx.db.get(p.userId);
      results.push({
        id: p.userId,
        role: p.role,
        name: p.name ?? user?.name ?? "",
        email: user?.email ?? "",
      });
    }

    return results;
  },
});
