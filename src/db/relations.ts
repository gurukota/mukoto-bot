import { relations } from "drizzle-orm/relations";
import { tblEvents, tblTickets, tblTicketType, tblSelectedCategories, tblEventCategories, tblCustomFields, tblOrganisers, tblUsers, tblCurrency, tblAccount, tblSession } from "./schema";

export const tblTicketsRelations = relations(tblTickets, ({one, many}) => ({
	tblEvent: one(tblEvents, {
		fields: [tblTickets.eventId],
		references: [tblEvents.id]
	}),
	tblTicketType: one(tblTicketType, {
		fields: [tblTickets.ticketTypeId],
		references: [tblTicketType.id]
	}),
	tblCustomFields: many(tblCustomFields),
}));

export const tblEventsRelations = relations(tblEvents, ({one, many}) => ({
	tblTickets: many(tblTickets),
	tblSelectedCategories: many(tblSelectedCategories),
	tblTicketTypes: many(tblTicketType),
	tblOrganiser: one(tblOrganisers, {
		fields: [tblEvents.organiserId],
		references: [tblOrganisers.id]
	}),
	tblUser: one(tblUsers, {
		fields: [tblEvents.createdBy],
		references: [tblUsers.id]
	}),
}));

export const tblTicketTypeRelations = relations(tblTicketType, ({one, many}) => ({
	tblTickets: many(tblTickets),
	tblEvent: one(tblEvents, {
		fields: [tblTicketType.eventId],
		references: [tblEvents.id]
	}),
	tblCurrency: one(tblCurrency, {
		fields: [tblTicketType.currencyCode],
		references: [tblCurrency.currencyCode]
	}),
}));

export const tblSelectedCategoriesRelations = relations(tblSelectedCategories, ({one}) => ({
	tblEvent: one(tblEvents, {
		fields: [tblSelectedCategories.eventId],
		references: [tblEvents.id]
	}),
	tblEventCategory: one(tblEventCategories, {
		fields: [tblSelectedCategories.categoryId],
		references: [tblEventCategories.id]
	}),
}));

export const tblEventCategoriesRelations = relations(tblEventCategories, ({many}) => ({
	tblSelectedCategories: many(tblSelectedCategories),
}));

export const tblCustomFieldsRelations = relations(tblCustomFields, ({one}) => ({
	tblTicket: one(tblTickets, {
		fields: [tblCustomFields.ticketId],
		references: [tblTickets.id]
	}),
}));

export const tblUsersRelations = relations(tblUsers, ({one, many}) => ({
	tblOrganiser: one(tblOrganisers, {
		fields: [tblUsers.organiserId],
		references: [tblOrganisers.id]
	}),
	tblEvents: many(tblEvents),
	tblAccounts: many(tblAccount),
	tblSessions: many(tblSession),
}));

export const tblOrganisersRelations = relations(tblOrganisers, ({many}) => ({
	tblUsers: many(tblUsers),
	tblEvents: many(tblEvents),
}));

export const tblCurrencyRelations = relations(tblCurrency, ({many}) => ({
	tblTicketTypes: many(tblTicketType),
}));

export const tblAccountRelations = relations(tblAccount, ({one}) => ({
	tblUser: one(tblUsers, {
		fields: [tblAccount.userId],
		references: [tblUsers.id]
	}),
}));

export const tblSessionRelations = relations(tblSession, ({one}) => ({
	tblUser: one(tblUsers, {
		fields: [tblSession.userId],
		references: [tblUsers.id]
	}),
}));