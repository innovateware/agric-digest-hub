import { internalMutation } from "./_generated/server";

const SAMPLE_RECORDS = [
  {
    year: 2024,
    zone: "North Central",
    state: "Kaduna",
    category: "Cereals",
    commodity_name: "Maize",
    unit_of_measurement: "Metric Tons",
    january: 1200, february: 1150, march: 1300, april: 1400,
    may: 1500, june: 1600, july: 1700, august: 1650,
    september: 1550, october: 1450, november: 1350, december: 1250,
    total: 17100, average: 1425,
  },
  {
    year: 2024,
    zone: "South West",
    state: "Oyo",
    category: "Root Crops",
    commodity_name: "Cassava",
    unit_of_measurement: "Metric Tons",
    january: 800, february: 820, march: 850, april: 900,
    may: 950, june: 1000, july: 1050, august: 1020,
    september: 980, october: 920, november: 880, december: 850,
    total: 11020, average: 918,
  },
  {
    year: 2024,
    zone: "North East",
    state: "Borno",
    category: "Legumes",
    commodity_name: "Groundnut",
    unit_of_measurement: "Metric Tons",
    january: 450, february: 460, march: 480, april: 500,
    may: 520, june: 540, july: 560, august: 550,
    september: 530, october: 510, november: 490, december: 470,
    total: 6060, average: 505,
  },
  {
    year: 2023,
    zone: "North Central",
    state: "Niger",
    category: "Cereals",
    commodity_name: "Rice",
    unit_of_measurement: "Metric Tons",
    january: 2000, february: 1950, march: 2100, april: 2200,
    may: 2300, june: 2400, july: 2500, august: 2450,
    september: 2350, october: 2250, november: 2150, december: 2050,
    total: 26700, average: 2225,
  },
  {
    year: 2023,
    zone: "South South",
    state: "Delta",
    category: "Tree Crops",
    commodity_name: "Oil Palm",
    unit_of_measurement: "Metric Tons",
    january: 600, february: 610, march: 630, april: 650,
    may: 670, june: 690, july: 710, august: 700,
    september: 680, october: 660, november: 640, december: 620,
    total: 7860, average: 655,
  },
];

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("statisticalData").first();
    if (existing) {
      return { seeded: false, message: "Data already exists, skipping seed." };
    }

    for (const record of SAMPLE_RECORDS) {
      await ctx.db.insert("statisticalData", record);
    }

    await ctx.db.insert("auditLog", {
      action: "import",
      entity_type: "StatisticalData",
      details: `Seeded ${SAMPLE_RECORDS.length} sample records`,
      user_email: "system",
    });

    return { seeded: true, count: SAMPLE_RECORDS.length };
  },
});
