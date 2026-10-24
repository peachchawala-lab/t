CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`event_date` text NOT NULL,
	`slot` text NOT NULL,
	`people` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`status` text NOT NULL,
	`idempotency` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_command` ON `bookings` (`user_id`,`idempotency`);--> statement-breakpoint
CREATE INDEX `bookings_capacity` ON `bookings` (`activity_id`,`event_date`,`slot`,`status`);--> statement-breakpoint
CREATE INDEX `bookings_user` ON `bookings` (`user_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_once` ON `favorites` (`user_id`,`activity_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_booking_id_unique` ON `reviews` (`booking_id`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`contact` text NOT NULL,
	`description` text NOT NULL,
	`lat` text NOT NULL,
	`lng` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shops_owner_id_unique` ON `shops` (`owner_id`);--> statement-breakpoint
CREATE TABLE `slot_switches` (
	`activity_id` text PRIMARY KEY NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`booking_id` text,
	`topic` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reply` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
