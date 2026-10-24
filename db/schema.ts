import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), name: text('name').notNull(), createdAt: integer('created_at').notNull(),
});
export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull().unique(), name: text('name').notNull(),
  address: text('address').notNull(), contact: text('contact').notNull(), description: text('description').notNull(),
  lat: text('lat').notNull(), lng: text('lng').notNull(), status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
});
export const listings = sqliteTable('listings', {
  // Shop registrations are owned by Supabase; retain the stable shop ID here.
  id: text('id').primaryKey(), shopId: text('shop_id').notNull(),
  payload: text('payload').notNull(), createdAt: integer('created_at').notNull(),
});
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), activityId: text('activity_id').notNull(),
  eventDate: text('event_date').notNull(), slot: text('slot').notNull(), people: integer('people').notNull(),
  unitPrice: integer('unit_price').notNull(), status: text('status').notNull(),
  idempotency: text('idempotency').notNull(), createdAt: integer('created_at').notNull(),
}, table=>[uniqueIndex('bookings_command').on(table.userId,table.idempotency),index('bookings_capacity').on(table.activityId,table.eventDate,table.slot,table.status),index('bookings_user').on(table.userId)]);
export const favorites = sqliteTable('favorites', {
  id:text('id').primaryKey(), userId:text('user_id').notNull(), activityId:text('activity_id').notNull(),
},table=>[uniqueIndex('favorite_once').on(table.userId,table.activityId)]);
export const reviews = sqliteTable('reviews', {
  id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id).unique(),
  userId:text('user_id').notNull(), activityId:text('activity_id').notNull(), rating:integer('rating').notNull(),
  comment:text('comment').notNull(), kind:text('kind').notNull(), createdAt:integer('created_at').notNull(),
});
export const tickets = sqliteTable('tickets', {
  id:text('id').primaryKey(), userId:text('user_id').notNull(), bookingId:text('booking_id').references(()=>bookings.id),
  topic:text('topic').notNull(), message:text('message').notNull(), status:text('status').notNull().default('open'),
  reply:text('reply'), createdAt:integer('created_at').notNull(), updatedAt:integer('updated_at').notNull(),
});
export const slotSwitches = sqliteTable('slot_switches', {
  activityId:text('activity_id').primaryKey(), closed:integer('closed').notNull().default(0),
});

export const paymentReports = sqliteTable('payment_reports', {
  id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id),
  userId:text('user_id').notNull(), amountMinor:integer('amount_minor').notNull(), currency:text('currency').notNull().default('THB'),
  bankName:text('bank_name').notNull(), bankReference:text('bank_reference').notNull(), transferredAt:integer('transferred_at').notNull(),
  receiverVersion:text('receiver_version').notNull(), idempotency:text('idempotency').notNull(),
  status:text('status').notNull().default('pending'), createdAt:integer('created_at').notNull(),
  verifiedReference:text('verified_reference'), reviewNote:text('review_note'), reviewedBy:text('reviewed_by'), reviewedAt:integer('reviewed_at'),
},table=>[
  uniqueIndex('payment_command').on(table.userId,table.idempotency),
  uniqueIndex('payment_pending_booking').on(table.bookingId).where(sql`${table.status}='pending'`),
  uniqueIndex('payment_verified_booking').on(table.bookingId).where(sql`${table.status}='verified'`),
  uniqueIndex('payment_bank_entry').on(table.verifiedReference),
  index('payment_booking_history').on(table.bookingId,table.createdAt),
]);
