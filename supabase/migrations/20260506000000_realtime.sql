-- Aktivoi Supabase Realtime games- ja results-tauluille
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.results;
