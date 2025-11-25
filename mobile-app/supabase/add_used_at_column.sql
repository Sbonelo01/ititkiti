-- Optional: add `used_at` timestamp column to `tickets` table
-- Run this in Supabase SQL editor if you want to record when tickets were marked used.

alter table public.tickets
add column if not exists used_at timestamptz;
