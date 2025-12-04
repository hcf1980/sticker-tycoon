-- Reset admin password to default 'sticker2024!'
-- How to use: Paste this into Supabase SQL Editor and run.

BEGIN;

-- Ensure pgcrypto is available for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin if missing, otherwise reset its password
INSERT INTO admin_credentials (username, password_hash)
VALUES ('admin', crypt('sticker2024!', gen_salt('bf')))
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

COMMIT;

-- Optional: verify the reset succeeded (expect ok = true)
-- SELECT crypt('sticker2024!', password_hash) = password_hash AS ok
-- FROM admin_credentials WHERE username = 'admin';

