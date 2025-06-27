import { pgTable, foreignKey, text, varchar, boolean, numeric, timestamp, bigserial, char, unique, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const tickets = pgTable("tbl_tickets", {
	id: text().primaryKey().notNull(),
	eventId: text().notNull(),
	ticketTypeId: text().notNull(),
	nameOnTicket: varchar({ length: 255 }).notNull(),
	checkedIn: boolean().default(false),
	qrCode: varchar({ length: 255 }),
	pricePaid: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	deleted: boolean().default(false),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	paymentStatus: varchar({ length: 50 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [tblEvents.id],
			name: "tbl_tickets_eventId_tbl_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ticketTypeId],
			foreignColumns: [tblTicketType.id],
			name: "tbl_tickets_ticketTypeId_tbl_ticket_type_id_fk"
		}).onDelete("cascade"),
]);

export const selectedCategories = pgTable("tbl_selected_categories", {
	id: text().primaryKey().notNull(),
	eventId: text().notNull(),
	categoryId: text().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [tblEvents.id],
			name: "tbl_selected_categories_eventId_tbl_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [tblEventCategories.id],
			name: "tbl_selected_categories_categoryId_tbl_event_categories_id_fk"
		}).onDelete("cascade"),
]);

export const eventCategories = pgTable("tbl_event_categories", {
	id: text().primaryKey().notNull(),
	categoryName: varchar({ length: 255 }).notNull(),
	deleted: boolean().default(false).notNull(),
});

export const customFields = pgTable("tbl_custom_fields", {
	customFieldId: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ticketId: text().notNull(),
	label: varchar({ length: 255 }).notNull(),
	response: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tblTickets.id],
			name: "tbl_custom_fields_ticketId_tbl_tickets_id_fk"
		}).onDelete("cascade"),
]);

export const currency = pgTable("tbl_currency", {
	currencyCode: char({ length: 3 }).primaryKey().notNull(),
	currencyName: varchar({ length: 100 }).notNull(),
	deleted: boolean().default(false).notNull(),
});

export const users = pgTable("tbl_users", {
	id: text().primaryKey().notNull(),
	organiserId: text().notNull(),
	name: text(),
	email: text(),
	emailVerified: timestamp({ mode: 'string' }),
	phoneNumber: varchar({ length: 20 }),
	image: text(),
	role: text(),
	canApproveTickets: boolean().default(false),
	deleted: boolean().default(false),
	banned: boolean(),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.organiserId],
			foreignColumns: [tblOrganisers.id],
			name: "tbl_users_organiserId_tbl_organisers_id_fk"
		}).onDelete("cascade"),
	unique("tbl_users_email_unique").on(table.email),
	unique("tbl_users_phoneNumber_unique").on(table.phoneNumber),
]);

export const organisers = pgTable("tbl_organisers", {
	id: text().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	address: varchar({ length: 255 }).notNull(),
	country: varchar({ length: 100 }).notNull(),
	website: varchar({ length: 255 }),
	deleted: boolean().default(false).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const ticketType = pgTable("tbl_ticket_type", {
	id: text().primaryKey().notNull(),
	eventId: text().notNull(),
	typeName: varchar({ length: 100 }).notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	currencyCode: char({ length: 3 }).notNull(),
	description: text(),
	availableQuantity: integer().notNull(),
	deleted: boolean().default(false),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	splitPercentage: numeric({ precision: 5, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [tblEvents.id],
			name: "tbl_ticket_type_eventId_tbl_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.currencyCode],
			foreignColumns: [tblCurrency.currencyCode],
			name: "tbl_ticket_type_currencyCode_tbl_currency_currencyCode_fk"
		}),
]);

export const verification = pgTable("tbl_verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const events = pgTable("tbl_events", {
	id: text().primaryKey().notNull(),
	organiserId: text().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	image: text(),
	start: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	end: timestamp({ withTimezone: true, mode: 'string' }),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 20 }),
	address: varchar({ length: 255 }),
	location: text().notNull(),
	country: varchar({ length: 100 }).notNull(),
	approveTickets: boolean().default(false),
	isActive: boolean().default(false),
	soldOut: boolean().default(false),
	registrationDeadline: timestamp({ withTimezone: true, mode: 'string' }),
	deleted: boolean().default(false),
	createdBy: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.organiserId],
			foreignColumns: [tblOrganisers.id],
			name: "tbl_events_organiserId_tbl_organisers_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [tblUsers.id],
			name: "tbl_events_createdBy_tbl_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const account = pgTable("tbl_account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [tblUsers.id],
			name: "tbl_account_user_id_tbl_users_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("tbl_session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
	impersonatedBy: text("impersonated_by"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [tblUsers.id],
			name: "tbl_session_user_id_tbl_users_id_fk"
		}).onDelete("cascade"),
	unique("tbl_session_token_unique").on(table.token),
]);
