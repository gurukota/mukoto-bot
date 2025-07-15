import { relations } from 'drizzle-orm/relations';
import {
  events,
  tickets,
  ticketTypes,
  selectedEventCategories,
  eventCategories,
  tblCustomFields,
  organisers,
  users,
  currencies,
  account,
  session,
} from './schema.js';

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [tickets.ticketTypeId],
    references: [ticketTypes.id],
  }),
  customFields: many(tblCustomFields),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  tickets: many(tickets),
  selectedCategories: many(selectedEventCategories),
  ticketTypes: many(ticketTypes),
  organiser: one(organisers, {
    fields: [events.organiserId],
    references: [organisers.id],
  }),
  user: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  tickets: many(tickets),
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  currency: one(currencies, {
    fields: [ticketTypes.currencyCode],
    references: [currencies.currencyCode],
  }),
}));

export const selectedCategoriesRelations = relations(
  selectedEventCategories,
  ({ one }) => ({
    event: one(events, {
      fields: [selectedEventCategories.eventId],
      references: [events.id],
    }),
    eventCategory: one(eventCategories, {
      fields: [selectedEventCategories.categoryId],
      references: [eventCategories.id],
    }),
  })
);

export const eventCategoriesRelations = relations(
  eventCategories,
  ({ many }) => ({
    selectedCategories: many(selectedEventCategories),
  })
);

export const customFieldsRelations = relations(tblCustomFields, ({ one }) => ({
  ticket: one(tickets, {
    fields: [tblCustomFields.ticketId],
    references: [tickets.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organiser: one(organisers, {
    fields: [users.organiserId],
    references: [organisers.id],
  }),
  events: many(events),
  accounts: many(account),
  sessions: many(session),
}));

export const organisersRelations = relations(organisers, ({ many }) => ({
  users: many(users),
  events: many(events),
}));

export const currenciesRelations = relations(currencies, ({ many }) => ({
  ticketTypes: many(ticketTypes),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));
