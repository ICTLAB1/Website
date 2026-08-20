-- Drops the unused Setting key/value table.
--
-- Business identity is supplied through environment configuration so that it
-- can differ per deployment, so nothing in the application ever read or wrote
-- this table. Leaving it in place would be schema nobody maintains.
DROP TABLE IF EXISTS "Setting";
