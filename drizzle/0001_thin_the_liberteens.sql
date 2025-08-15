ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "artist" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "date" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "medium" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "department" SET DATA TYPE varchar(300);--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "culture" SET DATA TYPE varchar(300);--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "objectUrl" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "classification" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "met-galaxy_artwork" ALTER COLUMN "artistNationality" SET DATA TYPE varchar(500);