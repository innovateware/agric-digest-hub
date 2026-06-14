import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const monthlyFields = {
  january: v.optional(v.number()),
  february: v.optional(v.number()),
  march: v.optional(v.number()),
  april: v.optional(v.number()),
  may: v.optional(v.number()),
  june: v.optional(v.number()),
  july: v.optional(v.number()),
  august: v.optional(v.number()),
  september: v.optional(v.number()),
  october: v.optional(v.number()),
  november: v.optional(v.number()),
  december: v.optional(v.number()),
};

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("data_entry"),
      v.literal("viewer")
    ),
    name: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  statisticalData: defineTable({
    year: v.number(),
    zone: v.string(),
    state: v.string(),
    category: v.string(),
    commodity_name: v.string(),
    unit_of_measurement: v.string(),
    ...monthlyFields,
    total: v.optional(v.number()),
    average: v.optional(v.number()),
  })
    .index("by_year", ["year"])
    .index("by_state", ["state"])
    .index("by_zone", ["zone"])
    .index("by_category", ["category"])
    .index("by_commodity", ["commodity_name"]),

  auditLog: defineTable({
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    details: v.string(),
    user_email: v.optional(v.string()),
  }).index("by_action", ["action"]),
});
