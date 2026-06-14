import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  formatStatisticalRecord,
  statisticalDataValidator,
} from "./lib/statisticalDataFields";
import {
  getCurrentUserEmail,
  requireAuth,
  requireRole,
} from "./lib/permissions";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const records = await ctx.db.query("statisticalData").order("desc").take(5000);

    return records.map(formatStatisticalRecord);
  },
});

export const create = mutation({
  args: statisticalDataValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "data_entry"]);

    const id = await ctx.db.insert("statisticalData", args);
    const email = await getCurrentUserEmail(ctx);

    await ctx.db.insert("auditLog", {
      action: "create",
      entity_type: "StatisticalData",
      entity_id: id,
      details: `Created record: ${args.commodity_name} - ${args.state} (${args.year})`,
      user_email: email,
    });

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error("Failed to create record");
    }
    return formatStatisticalRecord(doc);
  },
});

export const update = mutation({
  args: {
    id: v.id("statisticalData"),
    ...statisticalDataValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "data_entry"]);

    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Record not found");
    }

    await ctx.db.patch(id, data);
    const email = await getCurrentUserEmail(ctx);

    await ctx.db.insert("auditLog", {
      action: "update",
      entity_type: "StatisticalData",
      entity_id: id,
      details: `Updated record: ${data.commodity_name} - ${data.state} (${data.year})`,
      user_email: email,
    });

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error("Failed to update record");
    }
    return formatStatisticalRecord(doc);
  },
});

export const remove = mutation({
  args: { id: v.id("statisticalData") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Record not found");
    }

    await ctx.db.delete(args.id);
    const email = await getCurrentUserEmail(ctx);

    await ctx.db.insert("auditLog", {
      action: "delete",
      entity_type: "StatisticalData",
      entity_id: args.id,
      details: `Deleted record: ${existing.commodity_name} - ${existing.state} (${existing.year})`,
      user_email: email,
    });
  },
});

export const bulkCreate = mutation({
  args: {
    records: v.array(v.object(statisticalDataValidator)),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "data_entry"]);

    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("statisticalData", record);
      ids.push(id);
    }

    return { count: ids.length, ids };
  },
});

export const logExport = mutation({
  args: {
    count: v.number(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const email = await getCurrentUserEmail(ctx);

    await ctx.db.insert("auditLog", {
      action: "export",
      entity_type: "StatisticalData",
      details: `Exported ${args.count} records to ${args.format}`,
      user_email: email,
    });
  },
});

export const logImport = mutation({
  args: {
    count: v.number(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "data_entry"]);
    const email = await getCurrentUserEmail(ctx);

    await ctx.db.insert("auditLog", {
      action: "import",
      entity_type: "StatisticalData",
      details: `Imported ${args.count} records from ${args.filename}`,
      user_email: email,
    });
  },
});
