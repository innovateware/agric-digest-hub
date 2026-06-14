import { v } from "convex/values";

export const statisticalDataValidator = {
  year: v.number(),
  zone: v.string(),
  state: v.string(),
  category: v.string(),
  commodity_name: v.string(),
  unit_of_measurement: v.string(),
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
  total: v.optional(v.number()),
  average: v.optional(v.number()),
};

export function formatStatisticalRecord(doc: {
  _id: string;
  _creationTime: number;
  year: number;
  zone: string;
  state: string;
  category: string;
  commodity_name: string;
  unit_of_measurement: string;
  january?: number;
  february?: number;
  march?: number;
  april?: number;
  may?: number;
  june?: number;
  july?: number;
  august?: number;
  september?: number;
  october?: number;
  november?: number;
  december?: number;
  total?: number;
  average?: number;
}) {
  return {
    id: doc._id,
    created_date: new Date(doc._creationTime).toISOString(),
    year: doc.year,
    zone: doc.zone,
    state: doc.state,
    category: doc.category,
    commodity_name: doc.commodity_name,
    unit_of_measurement: doc.unit_of_measurement,
    january: doc.january,
    february: doc.february,
    march: doc.march,
    april: doc.april,
    may: doc.may,
    june: doc.june,
    july: doc.july,
    august: doc.august,
    september: doc.september,
    october: doc.october,
    november: doc.november,
    december: doc.december,
    total: doc.total,
    average: doc.average,
  };
}
