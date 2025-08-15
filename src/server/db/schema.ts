// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator, text, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `met-galaxy_${name}`);

// Met Museum artwork schema with larger field sizes
export const artworks = createTable(
  "artwork",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    objectId: d.integer().notNull(),
    title: d.text(), // Changed from varchar(500) to text
    artist: d.text(), // Changed from varchar(500) to text
    date: d.varchar({ length: 200 }), // Increased from 100
    medium: d.text(), // Changed from varchar(500) to text
    primaryImage: d.varchar({ length: 1000 }),
    department: d.varchar({ length: 300 }), // Increased from 200
    culture: d.varchar({ length: 300 }), // Increased from 200
    createdAt: d.timestamp({ withTimezone: true }),
    additionalImages: d.text(), // JSON array as text
    objectUrl: d.varchar({ length: 1000 }), // Increased from 500
    isHighlight: d.boolean(),
    artistDisplayBio: d.text(),
    objectBeginDate: d.integer(),
    objectEndDate: d.integer(),
    creditLine: d.text(),
    classification: d.varchar({ length: 500 }), // Increased from 200
    artistNationality: d.varchar({ length: 500 }), // Increased from 200
    primaryImageSmall: d.varchar({ length: 1000 }),
    description: d.text(),
    importedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
);
