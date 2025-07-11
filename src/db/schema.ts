import { relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  char,
  boolean,
  timestamp,
  numeric,
  bigserial,
  text,
  integer,
} from "drizzle-orm/pg-core";

// currencies
export const currencies = pgTable("tbl_currency", {
  currencyCode: char("currencyCode", { length: 3 }).primaryKey(),
  currencyName: varchar("currencyName", { length: 100 }).notNull(),
  deleted: boolean("deleted").default(false).notNull(),
});

// organisers
export const organisers = pgTable("tbl_organisers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  website: varchar("website", { length: 255 }),
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// tblEventCategories
export const eventCategories = pgTable("tbl_event_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  categoryName: varchar("categoryName", { length: 255 }).notNull(),
  deleted: boolean("deleted").default(false).notNull(),
});

// users
export const users = pgTable("tbl_users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organiserId: text("organiserId")
    .notNull()
    .references(() => organisers.id, { onDelete: "cascade" }),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("emailVerified").default(false),
  phoneNumber: varchar("phoneNumber", { length: 20 }).unique(),
  image: text("image"),
  role: text('role'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  canApproveTickets: boolean("canApproveTickets").default(false),
  deleted: boolean("deleted").default(false),
});

export const session = pgTable("tbl_session", {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  impersonatedBy: text('impersonated_by'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
});

export const account = pgTable("tbl_account", {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("tbl_verification", {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

// events
export const events = pgTable("tbl_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organiserId: text("organiserId")
    .notNull()
    .references(() => organisers.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  image: text("image"),
  start: timestamp("start", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  end: timestamp("end", { withTimezone: true, mode: "string" }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  address: varchar("address", { length: 255 }),
  location: text("location").notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  approveTickets: boolean("approveTickets").default(false).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  soldOut: boolean("soldOut").default(false).notNull(),
  registrationDeadline: timestamp("registrationDeadline", {
    withTimezone: true,
    mode: "string",
  }),
  deleted: boolean("deleted").default(false).notNull(),
  createdBy: text("createdBy").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

export const eventRelations = relations(events, ({ many }) => ({
  selectedEventCategories: many(selectedEventCategories),
}));
// ticketTypes
export const ticketTypes = pgTable("tbl_ticket_type", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text("eventId")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  typeName: varchar("typeName", { length: 100 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currencyCode: char("currencyCode", { length: 3 })
    .references(() => currencies.currencyCode)
    .notNull(),
  description: text("description"),
  splitPercentage: numeric("splitPercentage", { precision: 5, scale: 2 }), 
  availableQuantity: integer("availableQuantity").notNull(),
  deleted: boolean("deleted").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// tblTickets
export const tickets = pgTable("tbl_tickets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text("eventId")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  ticketTypeId: text("ticketTypeId")
    .notNull()
    .references(() => ticketTypes.id, { onDelete: "cascade" }),
  nameOnTicket: varchar("nameOnTicket", { length: 255 }).notNull(),
  paymentStatus: varchar("paymentStatus", { length: 50 }).notNull(),
  checkedIn: boolean("checkedIn").default(false),
  qrCode: varchar("qrCode", { length: 255 }),
  pricePaid: numeric("pricePaid", { precision: 10, scale: 2 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  deleted: boolean("deleted").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// tblCustomFields
export const tblCustomFields = pgTable("tbl_custom_fields", {
  customFieldId: bigserial({ mode: "number" }).primaryKey(),
  ticketId: text("ticketId")
    .references(() => tickets.id, {
      onDelete: "cascade",
    })
    .notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  response: varchar("response", { length: 255 }),
});

export const selectedEventCategories = pgTable("tbl_selected_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text("eventId")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  categoryId: text("categoryId")
    .notNull()
    .references(() => eventCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const eventCategoriesRelations = relations(
  selectedEventCategories,
  ({ one }) => ({
    event: one(events, {
      fields: [selectedEventCategories.eventId],
      references: [events.id],
    }),
  })
);

export const organiserRelations = relations(organisers, ({ many }) => ({
  users: many(users),
  events: many(events),
}));

export const userRelations = relations(users, ({ one }) => ({
  organiser: one(organisers, {
    fields: [users.organiserId],
    references: [organisers.id],
  }),
}))

export const ticketTypeRelation = relations(ticketTypes, ({one}) =>({
  event: one(events,{
    fields: [ticketTypes.eventId],
    references: [events.id]
  }),
  currency: one(currencies, {
    fields: [ticketTypes.currencyCode],
    references: [currencies.currencyCode]
  })
  
}))
