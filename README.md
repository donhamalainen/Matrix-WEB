# Helsinki Cup Challenge App

Full-stack PoC nuorten haastesovellus Helsinki Cup -tapahtumaan ja koulutapahtumiin. Käyttäjät voivat luoda tiimejä, haastaa toisiaan jalkapallossa, koripallossa ja pingiksessä, kirjata tuloksia ja seurata leaderboardia.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS)

## Käynnistys

### 1. Supabase-projekti

1. Luo uusi projekti: <https://supabase.com>
2. Avaa **SQL Editor** ja aja `supabase/schema.sql`.
3. **Authentication → Providers → Phone**: ota käyttöön ja konfiguroi SMS-provider (Twilio / MessageBird tms.).
4. Kopioi projektin **URL** ja **anon public key** (Project Settings → API).

### 2. Ympäristömuuttujat

```bash
cp .env.local.example .env.local
```

Täytä `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Aja kehityspalvelin

```bash
npm install
npm run dev
```

Sovellus avautuu osoitteessa <http://localhost:3000>. Selain ohjaa kirjautumissivulle.

## Sovelluksen rakenne

```
src/
├── app/
│   ├── kirjaudu/                # Phone OTP -kirjautuminen
│   ├── auth/nimimerkki/         # Nimimerkin asetus ensimmäisellä kerralla
│   ├── (app)/                   # Suojattu app shell (yläpalkki + alanavi)
│   │   ├── layout.tsx
│   │   ├── tiimi/               # Tiimin luonti, liittyminen, haaste
│   │   ├── haasteet/            # Saapuneet/lähetetyt, hyväksy/hylkää
│   │   ├── tulokset/            # Kirjaa tulos, vahvista, historia
│   │   └── ranking/             # Leaderboard + lajisuodatin
│   ├── layout.tsx
│   └── page.tsx                 # Redirect → /tiimi
├── components/
│   ├── BottomNav.tsx            # Mobiilin alapalkki
│   └── SportFilter.tsx          # Lajisuodatin (URL-param)
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-client
│   │   ├── server.ts            # Server Component -client (cookies)
│   │   └── middleware.ts        # Sessio + reittisuojaus
│   ├── auth.ts                  # requireUser / getProfile / getMyTeam
│   └── sports.ts                # Lajien metadata + värikoodit
├── middleware.ts                # Reitin suojaus
supabase/schema.sql              # Tietokantaskeema + RLS + leaderboard view
```

## Päänäkymät (5)

| Reitti        | Sisältö |
| ------------- | ------- |
| `/kirjaudu`   | Puhelinnumero → OTP |
| `/tiimi`      | Tiimin tiedot, jäsenet, liittymiskoodi, lähetä haaste |
| `/haasteet`   | Saapuneet & lähetetyt, hyväksy/hylkää, lajisuodatin |
| `/tulokset`   | Yhteenveto + tuloksen kirjaus / vahvistus + historia |
| `/ranking`    | Leaderboard kaikista tiimeistä, lajisuodatin |

## Lajien värikoodit

- ⚽ Jalkapallo → emerald (vihreä)
- 🏀 Koripallo → amber (keltainen)
- 🏓 Pingis → sky (sininen)

## Pisteytys

Voitto = **3p** · Tasapeli = **1p** · Tappio = **0p**

Ottelu lasketaan rankingiin vasta kun **molemmat osapuolet** ovat vahvistaneet saman lopputuloksen.

## Tietoturva (RLS)

- Tiimin luonti ja koodilla liittyminen tapahtuu `SECURITY DEFINER` -funktioiden kautta (`create_team`, `join_team_by_code`).
- Haasteita voi luoda vain oman tiimin nimissä; vain haasteen osapuolet voivat kirjata tuloksia.
- Leaderboard-näkymä on luettavissa kaikille.

## Tehty / vielä tekemättä

- ✅ Kirjautuminen (Phone OTP) + nimimerkki
- ✅ Tiimin luonti & liittyminen koodilla
- ✅ Haasteen lähetys, hyväksyntä, hylkäys
- ✅ Tuloksen kirjaus + molempien vahvistus
- ✅ Leaderboard + lajisuodatin
- ⬜ Realtime-päivitykset
- ⬜ Pelaaja vs. pelaaja -haasteet
- ⬜ Avatar / profiilisivu
