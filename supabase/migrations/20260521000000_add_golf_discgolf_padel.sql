-- Lisää Golf, Frisbeegolf ja Padel lajeiksi
alter table public.games
  drop constraint if exists games_sport_check;

alter table public.games
  add constraint games_sport_check
    check (sport in (
      'football',
      'basketball',
      'pingpong',
      'volleyball',
      'tennis',
      'badminton',
      'icehockey',
      'darts',
      'billiards',
      'martialarts',
      'golf',
      'discgolf',
      'padel',
      'other'
    ));
