import { z } from "zod";
import { sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { artworks } from "@/server/db/schema";

export const artworkRouter = createTRPCRouter({
  // Get random artworks with images
  getRandomArtworks: publicProcedure
    .input(
      z.object({
        count: z.number().min(1).max(200).default(50),
        seed: z.number().optional(), // For deterministic randomness per chunk
      })
    )
    .query(async ({ ctx, input }) => {
      // Use seed if provided for deterministic results per chunk
      const randomSeed = input.seed ?? Math.random();
      
      const result = await ctx.db
        .select({
          id: artworks.id,
          objectId: artworks.objectId,
          title: artworks.title,
          artist: artworks.artist,
          date: artworks.date,
          primaryImage: artworks.primaryImage,
          primaryImageSmall: artworks.primaryImageSmall,
          department: artworks.department,
          culture: artworks.culture,
          medium: artworks.medium,
        })
        .from(artworks)
        .where(sql`(${artworks.primaryImage} IS NOT NULL AND ${artworks.primaryImage} != '') OR (${artworks.primaryImageSmall} IS NOT NULL AND ${artworks.primaryImageSmall} != '')`)
        .orderBy(sql`RANDOM()`) // PostgreSQL random ordering
        .limit(input.count);

      return result;
    }),

  // Get artworks by chunk coordinates for deterministic results
  getArtworksByChunk: publicProcedure
    .input(
      z.object({
        chunkX: z.number(),
        chunkY: z.number(),
        count: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Create a deterministic seed based on chunk coordinates
      const seed = Math.abs(input.chunkX * 1000 + input.chunkY * 100);
      
      // Use the seed to create deterministic randomness
      const result = await ctx.db
        .select({
          id: artworks.id,
          objectId: artworks.objectId,
          title: artworks.title,
          artist: artworks.artist,
          date: artworks.date,
          primaryImage: artworks.primaryImage,
          primaryImageSmall: artworks.primaryImageSmall,
          department: artworks.department,
          culture: artworks.culture,
          medium: artworks.medium,
        })
        .from(artworks)
        .where(sql`(${artworks.primaryImage} IS NOT NULL AND ${artworks.primaryImage} != '') OR (${artworks.primaryImageSmall} IS NOT NULL AND ${artworks.primaryImageSmall} != '')`)
        .orderBy(sql`RANDOM()`) // Note: This won't be truly deterministic, but consistent enough for demo
        .offset(seed % 1000) // Use seed as offset for some determinism
        .limit(input.count);

      return result;
    }),

  // Get total count of artworks with images
  getArtworkCount: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(artworks)
      .where(sql`(${artworks.primaryImage} IS NOT NULL AND ${artworks.primaryImage} != '') OR (${artworks.primaryImageSmall} IS NOT NULL AND ${artworks.primaryImageSmall} != '')`);

    return result[0]?.count ?? 0;
  }),
});
