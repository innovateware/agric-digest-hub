import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/permissions";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);

    const logs = await ctx.db.query("auditLog").order("desc").take(200);

    return logs.map((log) => ({
      id: log._id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      user_email: log.user_email,
      created_date: new Date(log._creationTime).toISOString(),
    }));
  },
});

export const create = mutation({
  args: {
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    details: v.string(),
    user_email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.insert("auditLog", args);
  },
});
