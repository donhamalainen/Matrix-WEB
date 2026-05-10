/**
 * Matrix — kuormitustesti
 * Aja: k6 run stress-test.js
 *
 * Simuloi realistista käyttäjäpolkua (ilman sessiota):
 *  1. GET /kirjaudu   — julkinen sivu, vastaa 200
 *  2. GET /pelit      — middleware redirectaa /kirjaudu (302→200, k6 seuraa automaattisesti)
 *  3. GET /haasteet   — sama
 *  4. GET /ranking    — sama
 *
 * Mittaa: Nginx-proxy + Next.js middleware + SSR-kapasiteetti
 * Ei mittaa: Supabase-kyselyt (vaatisi autentikoinnin)
 *
 * Rajat:
 *  ✓ p(95) < 3 s
 *  ✓ virheprosentti < 5 % (5xx tai connection error)
 */

import http from "k6/http";
import { sleep, check } from "k6";

// ----- Kohde -----
const BASE = "https://matrix.boggo.fi";

// ----- Kuormitusprofiilit -----
export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 500 }, // nopea nousu tunnettuun raja-arvoon
        { duration: "1m", target: 500 }, // pidetään 500 VU — baseline
        { duration: "30s", target: 600 }, // +100
        { duration: "1m", target: 600 }, // pidetään 600 VU
        { duration: "30s", target: 700 }, // +100
        { duration: "1m", target: 700 }, // pidetään 700 VU
        { duration: "30s", target: 800 }, // +100
        { duration: "1m", target: 800 }, // pidetään 800 VU
        { duration: "30s", target: 900 }, // +100
        { duration: "1m", target: 900 }, // pidetään 900 VU
        { duration: "30s", target: 0 }, // lasku alas
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95 % pyynnöistä alle 3 s
    http_req_failed: ["rate<0.05"], // alle 5 % 5xx/connection-virheitä
  },
};

// ----- Testiskenaario -----
export default function () {
  const params = {
    headers: { Accept: "text/html" },
    timeout: "10s",
  };

  // Kirjautumissivu — julkinen, vastaa 200
  let r = http.get(`${BASE}/kirjaudu`, params);
  check(r, { "kirjaudu 200": (res) => res.status === 200 });
  sleep(1);

  // Suojatut sivut — middleware redirectaa /kirjaudu:hun (302→200).
  // k6 seuraa redirectit automaattisesti, joten lopullinen status on 200.
  // Tarkistetaan vain ettei tule 5xx-virheitä.
  r = http.get(`${BASE}/pelit`, params);
  check(r, { "pelit ei kaadu": (res) => res.status < 500 });
  sleep(1);

  r = http.get(`${BASE}/haasteet`, params);
  check(r, { "haasteet ei kaadu": (res) => res.status < 500 });
  sleep(1);

  r = http.get(`${BASE}/ranking`, params);
  check(r, { "ranking ei kaadu": (res) => res.status < 500 });
  sleep(2);
}
