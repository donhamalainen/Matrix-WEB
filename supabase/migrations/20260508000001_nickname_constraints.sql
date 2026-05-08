-- =============================================================
-- Matrix — Nimimerkin DB-rajoitteet (8.5.2026)
-- Pakottaa nimimerkin pituuden ja kieltää välilyönnit reunoista,
-- jotta tyhjiä tai vain whitespace-nimimerkkejä ei voi tallentaa.
-- =============================================================

alter table public.users
  add constraint users_nickname_trim_chk
    check (nickname = btrim(nickname)),
  add constraint users_nickname_length_chk
    check (char_length(nickname) between 2 and 20);
