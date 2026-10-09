import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const shipments=sqliteTable('shipments',{id:text('id').primaryKey(),payload:text('payload').notNull()});
export const tickets=sqliteTable('tickets',{id:text('id').primaryKey(),subject:text('subject').notNull(),message:text('message').notNull(),status:text('status').notNull().default('Open'),created:text('created').notNull()});
