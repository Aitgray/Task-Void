CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`base_priority` integer DEFAULT 3 NOT NULL,
	`scheduled_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`retained` integer DEFAULT 0 NOT NULL,
	`skip_count` integer DEFAULT 0 NOT NULL,
	`last_skipped_at` integer,
	`archive_notes` text,
	`keywords` text,
	`device_scope` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
