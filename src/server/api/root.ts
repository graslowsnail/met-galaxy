import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { artworkRouter } from "@/server/api/routers/artwork";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  artwork: artworkRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.artwork.all();
 *       ^? Artwork[]
 */
export const createCaller = createCallerFactory(appRouter);
