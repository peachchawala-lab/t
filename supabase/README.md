# เที่ยวทันใจ: registration storage

Project: `https://lhjqvcealdonhatunmhu.supabase.co`

`tt_profiles` stores the verified Sites identity, display name and email.
`tt_shops` stores merchant applications, selected map coordinates and approval status.
Both tables have RLS enabled, explicit denial policies for browser roles, and no grants to `anon` or `authenticated`.

Authentication remains Sign in with ChatGPT, owned by Sites. The browser uses the Site API;
the Site verifies identity and calls `tt-registration` using `REGISTRATION_BRIDGE_KEY` from
Sites secrets. The function verifies its SHA-256 digest before any database operation.
Only a digest is committed. The Supabase service role credential stays inside the Edge Function runtime.

Bookings, capacity, reviews, favorites and support tickets remain in D1. New registration
writes go only to Supabase. When a signed-in user has an older D1 registration, the server
imports that user's profile/application into Supabase without deleting the old records.
Existing registration rows are retained as a recovery copy and are no longer written by the app.

Apply `schema.sql` only to an empty target. This project was inspected before initial setup.
The D1 migration removes the cross-database foreign key from listings while preserving their rows.

Do not put `REGISTRATION_BRIDGE_KEY` or a Supabase service key in public assets or Git.
