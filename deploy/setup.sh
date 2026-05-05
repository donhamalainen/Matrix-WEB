#!/bin/bash
# deploy/setup.sh — Asennusskripti Pi:lle (aja git pullin jälkeen)
# Käyttö: sudo bash deploy/setup.sh

set -e

echo "=== Matrix deploy ==="

# 1. Kopioi nginx-config paikoilleen
echo "[1/4] Nginx-konfiguraatio..."
cp deploy/nginx/matrix.boggo.fi /etc/nginx/sites-available/matrix
ln -sf /etc/nginx/sites-available/matrix /etc/nginx/sites-enabled/matrix

# 2. Testaa nginx-config
echo "[2/4] Testataan nginx-konfiguraatio..."
nginx -t

# 3. Hae SSL-sertifikaatti (jos ei ole vielä)
if [ ! -d /etc/letsencrypt/live/matrix.boggo.fi ]; then
    echo "[3/4] Haetaan SSL-sertifikaatti..."
    # Ladataan ensin pelkkä HTTP-versio certbot-haastetta varten
    systemctl reload nginx
    certbot certonly --webroot -w /var/www/certbot -d matrix.boggo.fi --non-interactive --agree-tos --email admin@boggo.fi
else
    echo "[3/4] SSL-sertifikaatti on jo olemassa, ohitetaan."
fi

# 4. Lataa nginx uudelleen täydellä HTTPS-configilla
echo "[4/4] Ladataan nginx uudelleen..."
systemctl reload nginx

echo ""
echo "✓ Valmis! matrix.boggo.fi on konfiguroitu."
echo ""
echo "Muista vielä:"
echo "  - Käynnistä Next.js portissa 3001 (esim. PM2:lla)"
echo "  - Lisää DNS A-tietue: matrix.boggo.fi → 85.23.204.33"
