import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { env } from '../src/env.js';
import { artworks } from '../src/server/db/schema.js';

interface MetArtworkRow {
  id: string;
  object_id: string;
  title: string;
  artist: string;
  date: string;
  medium: string;
  primary_image: string;
  department: string;
  culture: string;
  created_at: string;
  additional_images: string;
  object_url: string;
  is_highlight: string;
  artist_display_bio: string;
  object_begin_date: string;
  object_end_date: string;
  credit_line: string;
  classification: string;
  artist_nationality: string;
  primary_image_small: string;
  description: string;
}

class FailedRecordsImporter {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const client = postgres(env.DATABASE_URL);
    this.db = drizzle(client);
  }

  async importFailedRecords(csvFilePath: string, batchSize = 100) {
    console.log(`Starting failed records import from: ${csvFilePath}`);
    console.log(`Only importing objects with image URLs that aren't already in DB...`);

    try {
      // Read and parse CSV file
      const csvContent = readFileSync(csvFilePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as MetArtworkRow[];

      console.log(`Found ${records.length} total records in CSV`);

      // Filter records that have primary_image URLs
      const recordsWithImages = records.filter((record: MetArtworkRow) => {
        return record.primary_image && record.primary_image.trim() !== '';
      });

      console.log(`Found ${recordsWithImages.length} records with image URLs`);

      // Get existing object IDs from database
      const existingObjects = await this.db.select({ objectId: artworks.objectId }).from(artworks);
      const existingObjectIds = new Set(existingObjects.map(obj => obj.objectId));

      console.log(`Found ${existingObjectIds.size} existing records in database`);

      // Filter out records that are already in the database
      const newRecords = recordsWithImages.filter((record: MetArtworkRow) => {
        const objectId = parseInt(record.object_id) || 0;
        return !existingObjectIds.has(objectId);
      });

      console.log(`Found ${newRecords.length} new records to import`);

      if (newRecords.length === 0) {
        console.log('No new records to import. Exiting.');
        return;
      }

      // Process records in batches
      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);
        
        // Transform CSV rows to match database schema
        const transformedBatch = batch.map((row: MetArtworkRow) => ({
          objectId: parseInt(row.object_id) || 0,
          title: row.title || '',
          artist: row.artist || '',
          date: row.date || '',
          medium: row.medium || '',
          primaryImage: row.primary_image || '',
          department: row.department || '',
          culture: row.culture || '',
          createdAt: row.created_at ? new Date(row.created_at) : null,
          additionalImages: row.additional_images || '[]',
          objectUrl: row.object_url || '',
          isHighlight: row.is_highlight === 'true',
          artistDisplayBio: row.artist_display_bio || '',
          objectBeginDate: row.object_begin_date ? parseInt(row.object_begin_date) : null,
          objectEndDate: row.object_end_date ? parseInt(row.object_end_date) : null,
          creditLine: row.credit_line || '',
          classification: row.classification || '',
          artistNationality: row.artist_nationality || '',
          primaryImageSmall: row.primary_image_small || '',
          description: row.description || '',
        }));

        try {
          // Insert batch into database
          await this.db.insert(artworks).values(transformedBatch);
          
          console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}: ${transformedBatch.length} records`);
          
          importedCount += transformedBatch.length;
        } catch (error) {
          console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
          console.error(`First record in failed batch:`, transformedBatch[0]);
          skippedCount += transformedBatch.length;
        }
      }

      console.log(`🎉 Import completed!`);
      console.log(`✅ Successfully imported: ${importedCount} records`);
      console.log(`❌ Skipped due to errors: ${skippedCount} records`);
      console.log(`📊 Total processed: ${importedCount + skippedCount} records`);

    } catch (error) {
      console.error('❌ Error during artwork import:', error);
      throw error;
    }
  }

  async close() {
    // Close database connection
    await this.db.execute(sql`SELECT 1`);
  }
}

// Example usage function
async function main() {
  const importer = new FailedRecordsImporter();

  try {
    // Update this path to your CSV file location
    await importer.importFailedRecords('./data/met-artworks.csv');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await importer.close();
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FailedRecordsImporter };
