import { defineCollection, z } from "astro:content";

const bouquetSchema = z.object({
  title: z.string(),
  date: z.string(),
  feeling: z.string(),
  flowers: z.array(z.string()).default([]),
  palette: z.array(z.string()).length(4),
  photo: z.string().optional(),
  draft: z.boolean().default(false)
});

const flowerSchema = z.object({
  name: z.string(),
  tone: z.string(),
  seen: z.string(),
  note: z.string(),
  meaning: z.string(),
  photo: z.string().optional()
});

const unknownSchema = z.object({
  name: z.string(),
  tone: z.string(),
  description: z.string(),
  photo: z.string().optional()
});

export const collections = {
  bouquets: defineCollection({ type: "content", schema: bouquetSchema }),
  flowers: defineCollection({ type: "content", schema: flowerSchema }),
  unknowns: defineCollection({ type: "content", schema: unknownSchema })
};
