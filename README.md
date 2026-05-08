# Matrix — Haastesovellus

Nuorten haastesovellus tapahtumiin ja koulukäyttöön. Käyttäjät voivat haastaa toisiaan eri lajeissa, kirjata tuloksia ja seurata rankingia.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS)

**Tuotanto:** https://matrix.boggo.fi

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

```bash
npx supabase db push --linked    # tuotantoon
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
│   ├── kirjaudu/                # Email OTP -kirjautuminen (server-side session check)
│   ├── auth/
│   │   ├── callback/route.ts    # PKCE + token_hash, validoitu next-redirect
│   │   └── nimimerkki/          # Nimimerkin asetus (server action createProfile)
│   ├── (app)/                   # Suojattu app shell (yläpalkki + alanavi)
│   │   ├── pelit/               # Pelit, haasteen lähetys
│   │   ├── haasteet/            # Saapuneet, hyväksy/hylkää (vain vastustaja)
│   │   ├── tulokset/            # Tuloksen kirjaus + historia
│   │   └── ranking/             # Leaderboard + lajisuodatin
│   ├── layout.tsx
│   └── page.tsx                 # Redirect → /pelit
├── components/
│   ├── BottomNav.tsx            # Mobiilin alapalkki
│   └── SportFilter.tsx          # Lajisuodatin (URL-param)
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-client
│   │   ├── server.ts            # Server Component -client (cookies)
│   │   └── proxy.ts             # Middleware: sessio + reittisuojaus
│   ├── auth.ts                  # requireUser / getProfile (lukee me-viewä)
│   └── sports.ts                # Lajien metadata + värikoodit
├── proxy.ts                     # Middleware entry point
supabase/
├── config.toml                  # Lokaalin Supabasen asetukset
├── migrations/                  # SQL-migraatiot (ml. security_hardening)
└── schema.sql                   # Tietokantaskeema
deploy/
├── setup.sh                     # Nginx + SSL asennus
├── POSTFIX.md                   # Postfix SMTP -dokumentaatio
└── nginx/matrix.boggo.fi        # Nginx-konfiguraatio
```

## Päänäkymät

| Reitti      | Sisältö                               |
| ----------- | ------------------------------------- |
| `/kirjaudu` | Sähköposti → OTP-koodi                |
| `/pelit`    | Pelit, haasteen luonti                |
| `/haasteet` | Saapuneet & lähetetyt, hyväksy/hylkää |
| `/tulokset` | Tuloksen kirjaus + historia           |
| `/ranking`  | Leaderboard, lajisuodatin             |

## Lajien värikoodit

- ⚽ Jalkapallo → emerald (vihreä)
- 🏀 Koripallo → amber (keltainen)
- 🏓 Pingis → sky (sininen)

## Pisteytys

Voitto = **3p** · Tasapeli = **1p** · Tappio = **0p**

Ottelu lasketaan rankingiin vasta kun **molemmat osapuolet** ovat vahvistaneet saman lopputuloksen.

## Tietoturva

Row Level Security on päällä kaikissa tauluissa. Tarkemmat politiikat: [supabase/schema.sql](supabase/schema.sql).

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
