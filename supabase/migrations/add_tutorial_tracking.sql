-- Add tutorial tracking column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tutorial_shown_at TIMESTAMPTZ;
