import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { artworks } from "@/server/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(artworks)
      .where(sql`(${artworks.primaryImage} IS NOT NULL AND ${artworks.primaryImage} != '') OR (${artworks.primaryImageSmall} IS NOT NULL AND ${artworks.primaryImageSmall} != '')`)
      .orderBy(sql`RANDOM()`)
      .limit(10);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching random artworks:", error);
    return NextResponse.json(
      { error: "Failed to fetch artworks" },
      { status: 500 }
    );
  }
}
