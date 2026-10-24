PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_listings`("id", "shop_id", "payload", "created_at") SELECT "id", "shop_id", "payload", "created_at" FROM `listings`;--> statement-breakpoint
DROP TABLE `listings`;--> statement-breakpoint
ALTER TABLE `__new_listings` RENAME TO `listings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;