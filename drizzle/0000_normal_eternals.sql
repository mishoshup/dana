CREATE TABLE `Account` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'email' NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Debt` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`balance` real NOT NULL,
	`monthlyPayment` real NOT NULL,
	`interestRate` real,
	`startDate` text NOT NULL,
	`endDate` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `status` ON `Debt` (`status`);--> statement-breakpoint
CREATE TABLE `GrabEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`platform` text NOT NULL,
	`hours` real NOT NULL,
	`gross` real NOT NULL,
	`commission` real,
	`fuel` real,
	`tolls` real,
	`net` real,
	`notes` text,
	`createdAt` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `date` ON `GrabEntry` (`date`);--> statement-breakpoint
CREATE TABLE `MonthlyDashboard` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`salary` real DEFAULT 0 NOT NULL,
	`grabIncome` real DEFAULT 0 NOT NULL,
	`freelanceIncome` real DEFAULT 0 NOT NULL,
	`totalCommitments` real DEFAULT 0 NOT NULL,
	`food` real DEFAULT 0 NOT NULL,
	`fuelTolls` real DEFAULT 0 NOT NULL,
	`grabCosts` real DEFAULT 0 NOT NULL,
	`surplus` real,
	`notes` text,
	`createdAt` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MonthlyDashboard_month_unique` ON `MonthlyDashboard` (`month`);--> statement-breakpoint
CREATE INDEX `month` ON `MonthlyDashboard` (`month`);--> statement-breakpoint
CREATE TABLE `PaymentCalendar` (
	`id` text PRIMARY KEY NOT NULL,
	`debtId` text,
	`dueDate` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paidDate` text,
	`notes` text,
	`createdAt` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`debtId`) REFERENCES `Debt`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `status_dueDate` ON `PaymentCalendar` (`status`,`dueDate`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_token_unique` ON `Session` (`token`);--> statement-breakpoint
CREATE TABLE `Subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cost` real NOT NULL,
	`renewalDate` text,
	`category` text,
	`rating` text DEFAULT 'Essential' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`name` text,
	`image` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
