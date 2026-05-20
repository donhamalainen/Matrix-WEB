# Matrix — Kilpailualusta

Reaalimaailman kilpailualusta jossa yksilöt ja joukkueet voivat haastaa toisiaan eri lajeissa, kerätä pisteitä ja rakentaa yhteisöjä.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS + Realtime)

**Tuotanto:** https://matrix.boggo.fi

## Ominaisuudet

### Solo / Spontaanipelit

- Haasta toinen pelaaja nimimerkillä
- Valitse laji (10 lajia) ja pelimuoto (1v1, 2v2, 3v3, 5v5, 11v11)
- Flow: Challenge → Hyväksyntä → Peli IRL → Tulos → Ranking päivittyy

### Tiimipelit (2v2+)

- Valitse oma tiimi + vastustajatiimi pelaajapickeristä
- Haasteen vastaanottaa vastustajan "kapteeni" (away-tiimin ensimmäinen pelaaja)
- Kaikki tiimipelaajat näkevät pelin haasteet- ja tulokset-sivuilla
- Vain kapteenit (challenger/opponent) voivat hyväksyä haasteen ja kirjata tuloksen
- Tulos lasketaan leaderboardiin **kaikille** tiimipelaajille (game_players-taulu)

### Clan / Joukkuejärjestelmä

- Luo clan (nimi, tagi, kuvaus, avoin/suljettu)
- **Avoin clan** — kuka tahansa voi liittyä suoraan
- **Suljettu clan** — liittymispyyntö → omistaja/admin hyväksyy
- Kutsu pelaajia nimimerkillä → kutsuttu hyväksyy/hylkää
- Pelaaja voi kuulua vain yhteen claniin kerrallaan
- Roolit: owner, admin, member
- Omistaja voi poistaa jäseniä (kick)

### Ranking / Leaderboard

- Yksilöpohjainen pistejärjestelmä per laji
- Leaderboard yhdistää vanhat 1v1-pelit (challenger/opponent) ja uudet tiimipelit (game_players)
- Lajisuodatin kaikilla sivuilla
- Vain molemmin puolin vahvistetut tulokset lasketaan

### Realtime

- Automaattinen sivunpäivitys muutoksissa (games, results, game_players, clan_members, clan_invites, clan_join_requests)
- 1 sekunnin debounce estää refresh-stormin

## Käynnistys (lokaali kehitys)

### 1. Supabase-lokaali

```bash
npx supabase start
```

Käynnistää lokaalin Supabase-instanssin. Avaimet ja URL:t tulostuvat terminaaliin.

### 2. Ympäristömuuttujat

`.env`-tiedostossa on sekä tuotanto- että lokaali-asetukset. Lokaalia varten varmista, että LOCAL-osio on kommentoituna ja tuotanto kommentoituna (tai päinvastoin):

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Aja kehityspalvelin

```bash
npm install
npm run dev
```

Sovellus: http://localhost:3000 · Mailpit (sähköpostitestaus): http://127.0.0.1:54324

### 4. Migraatiot

Migraatiot ovat moduulikohtaisia (skeema, RLS, triggerit, realtime) — kts. [supabase/migrations/](supabase/migrations/).

```bash
npx supabase db push --linked    # aja uudet migraatiot tuotantoon
npx supabase db reset --linked   # nollaa tuotanto + aja kaikki migraatiot (HUOM: tuhoaa datan)
npx supabase db reset             # lokaalin nollaus + migraatiot
```

## Tuotanto-deploy (Raspberry Pi)

Palvelin: `85.23.204.33` · Domain: `matrix.boggo.fi`

```bash
ssh donhamalainen@<palvelin>
cd ~/Matrix
git pull
npm run build
pm2 restart matrix
```

Ensimmäisellä kerralla:

```bash
sudo chmod +x deploy/setup.sh
sudo ./deploy/setup.sh           # Nginx + SSL
pm2 start npm --name "matrix" -i 2 -- start -- -p 3001
pm2 save
```

### DNS-tietueet

| Tietue                        | Tyyppi    | Arvo                           |
| ----------------------------- | --------- | ------------------------------ |
| `matrix.boggo.fi`             | A         | `85.23.204.33`                 |
| `mail.boggo.fi`               | A         | `85.23.204.33`                 |
| `boggo.fi`                    | TXT (SPF) | `v=spf1 ip4:85.23.204.33 ~all` |
| `_dmarc.boggo.fi`             | TXT       | `v=DMARC1; p=none`             |
| `default._domainkey.boggo.fi` | TXT       | _(DKIM-avain)_                 |

### SMTP

Postfix + OpenDKIM Raspberry Pi:llä OTP-viestien lähettämiseen. Vaatii porttiohjauksen reitittimessä: `TCP 25/587 → 192.168.76.115`. Tarkemmat ohjeet: [deploy/POSTFIX.md](deploy/POSTFIX.md).

## Sovelluksen rakenne

```
src/
├── app/
│   ├── kirjaudu/                # Email OTP -kirjautuminen
│   ├── auth/
│   │   ├── callback/route.ts    # PKCE + token_hash
│   │   └── nimimerkki/          # Nimimerkin asetus
│   ├── (app)/                   # Suojattu app shell (yläpalkki + alanavi)
│   │   ├── pelit/               # Pelit, haasteen lähetys (+ team size)
│   │   ├── haasteet/            # Saapuneet, hyväksy/hylkää
│   │   ├── clan/                # Clan-järjestelmä
│   │   │   ├── page.tsx         # Oma clan tai clanlista + kutsut + pyynnöt
│   │   │   ├── luo/             # Clanin luonti (nimi, tagi, avoin/suljettu)
│   │   │   ├── actions.ts       # create/join/leave/kick/invite/accept/decline
│   │   │   ├── ClanInviteForm   # Kutsu pelaaja nimimerkillä
│   │   │   ├── ClanInviteList   # Saapuneet kutsut (hyväksy/hylkää)
│   │   │   ├── ClanJoinRequests # Liittymispyynnöt omistajalle
│   │   │   └── ClanJoinButton   # Liity/Pyydä liittyä
│   │   ├── tulokset/            # Tuloksen kirjaus + historia
│   │   └── ranking/             # Leaderboard + lajisuodatin
│   ├── layout.tsx
│   └── page.tsx                 # Redirect → /pelit
├── components/
│   ├── BottomNav.tsx            # Mobiilin alapalkki (5 tabia)
│   ├── RealtimeRefresh.tsx      # Realtime-kuuntelija (debounced)
│   └── SportFilter.tsx          # Lajisuodatin (URL-param)
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-client
│   │   ├── server.ts            # Server Component -client (cookies)
│   │   └── proxy.ts             # Middleware: sessio + reittisuojaus
│   ├── auth.ts                  # requireUser / getProfile
│   └── sports.ts                # Lajien metadata + värikoodit
├── proxy.ts                     # Middleware entry point
supabase/
├── config.toml                  # Lokaalin Supabasen asetukset
├── migrations/
│   ├── 20260502000000_schema.sql       # Taulut (users, games, results + viewit)
│   ├── 20260502000001_rls.sql          # RLS-politiikat ja grants
│   ├── 20260502000002_triggers.sql     # complete_game_when_confirmed
│   ├── 20260502000003_realtime.sql     # Realtime publication
│   ├── 20260502000004_add_sports.sql   # Lajilista laajennus
│   ├── 20260502000005_clans.sql        # Clanit + clan_members + team_size
│   ├── 20260502000006_fix_clan_invite_rls.sql  # Omistaja voi kutsua
│   ├── 20260502000007_clan_invites.sql         # Kutsujärjestelmä
│   ├── 20260502000008_clan_open_and_join_requests.sql  # Avoin/suljettu + pyynnöt
│   ├── 20260502000009_game_players.sql         # Tiimipelaajat + leaderboard v2
│   └── 20260502000010_realtime_extra.sql       # Realtime: game_players + clan-taulut
└── schema.sql                   # Koontidokumentti
deploy/
├── setup.sh                     # Nginx + SSL asennus
└── nginx/matrix.boggo.fi        # Nginx-konfiguraatio
```

## Päänäkymät

| Reitti           | Sisältö                                           |
| ---------------- | ------------------------------------------------- |
| `/kirjaudu`      | Sähköposti → linkki **ja** 6-numeroinen koodi     |
| `/auth/callback` | Sähköpostilinkin käsittely (sovelluksen oletus)   |
| `/auth/confirm`  | Sähköpostilinkin käsittely (Supabasen oletuspath) |
| `/pelit`         | Pelit, haasteen luonti (laji + team size)         |
| `/haasteet`      | Saapuneet & lähetetyt, hyväksy/hylkää             |
| `/clan`          | Oma clan / clanlista / kutsut / pyynnöt           |
| `/clan/luo`      | Uuden clanin luonti                               |
| `/tulokset`      | Tuloksen kirjaus + historia                       |
| `/ranking`       | Leaderboard, lajisuodatin                         |

## Kirjautumisen sähköpostimallit (Supabase)

Sekä `Confirm signup`- että `Magic Link`-mallien tulisi sisältää **sekä linkki että koodi**, jotta käyttäjä voi vahvistaa
kummalla tahansa (linkki toimii vain samasta selaimesta, koodi mistä tahansa):

```html
<p>Tervetuloa Matrixiin! Vahvista sähköpostiosoitteesi:</p>
<p><a href="{{ .ConfirmationURL }}">Vahvista ja kirjaudu sisään →</a></p>
<p>Tai syötä koodi sovellukseen: <strong>{{ .Token }}</strong></p>
```

Vinkki: jos haluat linkin toimivan luotettavasti myös eri laitteilla, korvaa `{{ .ConfirmationURL }}` muodolla
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` (tai `type=magiclink`). Tämä ohittaa PKCE-flown
ja kelpaa minkä tahansa selaimen avaamana.

## Lajit

⚽ Jalkapallo · 🏀 Koripallo · 🏓 Pingis · 🏐 Lentopallo · 🎾 Tennis · 🏸 Sulkapallo · 🏒 Jääkiekko · 🎯 Tikka · 🎱 Biljardi · 🏅 Muut

## Pisteytys

Voitto = **3p** · Tasapeli = **1p** · Tappio = **0p**

Ottelu lasketaan rankingiin vasta kun **molemmat osapuolet** ovat vahvistaneet saman lopputuloksen.

## Tietoturva

Row Level Security on päällä kaikissa tauluissa (`users`, `games`, `results`, `game_players`, `clans`, `clan_members`, `clan_invites`, `clan_join_requests`). Tarkemmat politiikat: [supabase/migrations/](supabase/migrations/).

### Käyttäjät (`public.users`)

- `select` rajattu sarakkeisiin `id, nickname, created_at` — vain kirjautuneille.
- Email ja phone luetaan vain `public.me`-viewistä, joka palauttaa pelkästään omat tiedot (`auth.uid() = id`).
- Profiilin luonti tehdään server actionissa [createProfile](src/app/auth/nimimerkki/actions.ts), joka lukee `phone`/`email` `auth.users`:sta — client ei voi spoofata niitä.
- DB-rajoite: nimimerkki 2–20 merkkiä, ei whitespacea reunoissa.

### Pelit (`public.games`)

- `insert` vain omalla `challenger_id`:llä.
- `update` vain vastustajalta, ja vain siirto `pending → accepted/declined`.
- Siirto `completed`-tilaan tehdään triggerillä `complete_game_when_confirmed` — ei suoraan API:n kautta.

### Tulokset (`public.results`)

- `insert` vain hyväksytylle pelille (`status = 'accepted'`) ja `recorded_by = auth.uid()`.
- `update` lukittu kun molemmat ovat vahvistaneet — vahvistettu tulos on immuuttinen.
- Pelin `completed`-tila päivittyy automaattisesti triggeristä.

### Auth-flow

- Email OTP (6-numeroinen koodi) ja magic link (PKCE).
- Kirjautuneen käyttäjän redirect tehdään server-puolella ([kirjaudu/page.tsx](src/app/kirjaudu/page.tsx)) — ei välkkyvää client-redirectiä.
- `/auth/callback` validoi `next`-parametrin: vain saman originin `/`-alkuiset polut sallittu (estetään open-redirect `//evil.com`).
- `signOut` tekee `revalidatePath("/", "layout")` ennen redirectäystä.

## Tehty / vielä tekemättä

- ✅ Kirjautuminen (Email OTP + magic link) + nimimerkki (server action)
- ✅ Haasteen lähetys, hyväksyntä (vain vastustaja), hylkäys
- ✅ Tuloksen kirjaus + molempien vahvistus + immuuttisuus
- ✅ Leaderboard + lajisuodatin
- ✅ Tuotanto-deploy (Nginx + SSL + PM2)
- ✅ SMTP-palvelin (Postfix + DKIM) — ks. [deploy/POSTFIX.md](deploy/POSTFIX.md)
- ✅ RLS-tiukennukset (column-level grants, tilakone, immuuttiset tulokset)
- ⬜ Realtime-päivitykset (osittain käytössä)
- ⬜ Avatar / profiilisivu
