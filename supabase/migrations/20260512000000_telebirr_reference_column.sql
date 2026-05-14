ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS telebirr_reference text;

UPDATE YeBetWegInitScript.sql SET -- This is a note to add the telebirr_reference column