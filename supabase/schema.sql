-- =============================================================
-- Matrix — Tietokantaskeeman koonti (luettavuusversio)
-- =============================================================
-- HUOM: Tämä tiedosto on lähdedokumentti DB:n nykyisestä rakenteesta
-- luettavuuden vuoksi. Migraatiot ovat oikea source-of-truth:
--   migrations/20260502000000_schema.sql    — taulut, indeksit, viewit
--   migrations/20260502000001_rls.sql       — RLS-politiikat, grants
--   migrations/20260502000002_triggers.sql  — triggerit
--   migrations/20260502000003_realtime.sql  — realtime publication
-- =============================================================

\i migrations/20260502000000_schema.sql
\i migrations/20260502000001_rls.sql
\i migrations/20260502000002_triggers.sql
\i migrations/20260502000003_realtime.sql
