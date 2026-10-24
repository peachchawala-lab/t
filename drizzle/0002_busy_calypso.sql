CREATE TABLE `payment_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'THB' NOT NULL,
	`bank_name` text NOT NULL,
	`bank_reference` text NOT NULL,
	`transferred_at` integer NOT NULL,
	`receiver_version` text NOT NULL,
	`idempotency` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`verified_reference` text,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_command` ON `payment_reports` (`user_id`,`idempotency`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_pending_booking` ON `payment_reports` (`booking_id`) WHERE "payment_reports"."status"='pending';--> statement-breakpoint
CREATE UNIQUE INDEX `payment_verified_booking` ON `payment_reports` (`booking_id`) WHERE "payment_reports"."status"='verified';--> statement-breakpoint
CREATE UNIQUE INDEX `payment_bank_entry` ON `payment_reports` (`verified_reference`);--> statement-breakpoint
CREATE INDEX `payment_booking_history` ON `payment_reports` (`booking_id`,`created_at`);