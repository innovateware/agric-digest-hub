import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getUserProfile, getCurrentUserEmail } from "./lib/permissions";
import { Scrypt } from "lucia";

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

export const repairOrphanedAccount = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .unique();

    if (account) {
      const user = await ctx.db.get(account.userId);
      if (user === null) {
        // Re-create user row
        const newUserId = await ctx.db.insert("users", {
          email: args.email,
        });
        await ctx.db.patch(account._id, { userId: newUserId });
        return { repaired: true, userId: newUserId };
      }
    }
    return { repaired: false };
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("data_entry"), v.literal("viewer")),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Ensure the calling user is an Admin
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }
    const currentProfile = await getUserProfile(ctx, currentUserId);
    if (currentProfile?.role !== "admin") {
      throw new Error("Forbidden: Only administrators can create users");
    }

    // 2. Check if the user already exists in 'users' or 'authAccounts'
    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .unique();
    if (existingAccount) {
      throw new Error("A user with this email already exists");
    }

    // 3. Create the user row
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
    });

    // 4. Hash the password and create the authAccounts row
    const hashedPassword = await new Scrypt().hash(args.password);
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: hashedPassword,
    });

    // 5. Create the user profile row
    await ctx.db.insert("userProfiles", {
      userId,
      role: args.role,
      name: args.name,
    });

    // 6. Log the audit event
    const adminEmail = await getCurrentUserEmail(ctx);
    await ctx.db.insert("auditLog", {
      action: "create",
      entity_type: "User",
      entity_id: userId,
      details: `Admin created user ${args.email} with role ${args.role}`,
      user_email: adminEmail,
    });

    return userId;
  },
});

export const changeUserPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Ensure the calling user is an Admin
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }
    const currentProfile = await getUserProfile(ctx, currentUserId);
    if (currentProfile?.role !== "admin") {
      throw new Error("Forbidden: Only administrators can change passwords");
    }

    // 2. Get the target user's email/account
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .unique();
    
    if (!account) {
      throw new Error("Credentials account not found for this user");
    }

    // 3. Hash new password and update
    const hashedPassword = await new Scrypt().hash(args.newPassword);
    await ctx.db.patch(account._id, { secret: hashedPassword });

    // 4. Log the audit event
    const adminEmail = await getCurrentUserEmail(ctx);
    await ctx.db.insert("auditLog", {
      action: "update",
      entity_type: "User",
      entity_id: args.userId,
      details: `Admin changed password for user ${user.email}`,
      user_email: adminEmail,
    });

    return { success: true };
  },
});

export const removeUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Ensure admin
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }
    const currentProfile = await getUserProfile(ctx, currentUserId);
    if (currentProfile?.role !== "admin") {
      throw new Error("Forbidden: Only administrators can delete users");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't let admin delete themselves
    if (args.userId === currentUserId) {
      throw new Error("You cannot delete your own account");
    }

    // Delete userProfiles, authAccounts, authSessions, and user row
    const profile = await getUserProfile(ctx, args.userId);
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const acc of accounts) {
      await ctx.db.delete(acc._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const sess of sessions) {
      await ctx.db.delete(sess._id);
    }

    await ctx.db.delete(args.userId);

    // Audit log
    const adminEmail = await getCurrentUserEmail(ctx);
    await ctx.db.insert("auditLog", {
      action: "delete",
      entity_type: "User",
      entity_id: args.userId,
      details: `Admin deleted user ${user.email}`,
      user_email: adminEmail,
    });

    return { success: true };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Update name in userProfiles
    const profile = await getUserProfile(ctx, userId);
    if (profile) {
      await ctx.db.patch(profile._id, { name: args.name });
    }

    // Update name in users
    await ctx.db.patch(userId, { name: args.name });

    // Log audit
    const email = await getCurrentUserEmail(ctx);
    await ctx.db.insert("auditLog", {
      action: "update",
      entity_type: "User",
      entity_id: userId,
      details: `User updated display name to ${args.name}`,
      user_email: email,
    });

    return { success: true };
  },
});

export const changeOwnPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password")
      )
      .unique();

    if (!account) {
      throw new Error("Password credentials account not found");
    }

    // Verify current password
    const verified = await new Scrypt().verify(account.secret ?? "", args.currentPassword);
    if (!verified) {
      throw new Error("Current password is incorrect");
    }

    // Hash and save new password
    const hashedPassword = await new Scrypt().hash(args.newPassword);
    await ctx.db.patch(account._id, { secret: hashedPassword });

    // Log audit
    const email = await getCurrentUserEmail(ctx);
    await ctx.db.insert("auditLog", {
      action: "update",
      entity_type: "User",
      entity_id: userId,
      details: `User changed their password`,
      user_email: email,
    });

    return { success: true };
  },
});

export const getMyProviders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    return accounts.map(a => a.provider);
  },
});

