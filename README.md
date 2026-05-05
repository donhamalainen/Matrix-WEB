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

### SMTP (suunnitteilla)

Postfix + OpenDKIM Raspberry Pi:llä OTP-viestien lähettämiseen. Vaatii porttiohjauksen reitittimessä: `TCP 25 → 192.168.76.115:25`.

## Sovelluksen rakenne

```
src/
├── app/
│   ├── kirjaudu/                # Email OTP -kirjautuminen
│   ├── auth/
│   │   ├── callback/route.ts    # PKCE code exchange (magic link)
│   │   └── nimimerkki/          # Nimimerkin asetus ensimmäisellä kerralla
│   ├── (app)/                   # Suojattu app shell (yläpalkki + alanavi)
│   │   ├── pelit/               # Pelit, haasteen lähetys
│   │   ├── haasteet/            # Saapuneet, hyväksy/hylkää
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
│   ├── auth.ts                  # requireUser / getProfile
│   └── sports.ts                # Lajien metadata + värikoodit
├── proxy.ts                     # Middleware entry point
supabase/
├── config.toml                  # Lokaalin Supabasen asetukset
├── migrations/                  # SQL-migraatiot
└── schema.sql                   # Tietokantaskeema
deploy/
├── setup.sh                     # Nginx + SSL asennus
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

## Tietoturva (RLS)

- Haasteita voi luoda vain oman nimissä; vain haasteen osapuolet voivat kirjata tuloksia.
- Leaderboard-näkymä on luettavissa kaikille.
- Auth callback käyttää PKCE-flowta (ei tokeneita URL:ssä).

## Tehty / vielä tekemättä

- ✅ Kirjautuminen (Email OTP + magic link) + nimimerkki
- ✅ Haasteen lähetys, hyväksyntä, hylkäys
- ✅ Tuloksen kirjaus + molempien vahvistus
- ✅ Leaderboard + lajisuodatin
- ✅ Tuotanto-deploy (Nginx + SSL + PM2)
- ⬜ SMTP-palvelin (Postfix + DKIM)
- ⬜ Realtime-päivitykset
- ⬜ Avatar / profiilisivu
