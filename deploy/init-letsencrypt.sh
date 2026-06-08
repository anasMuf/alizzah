#!/usr/bin/env bash
#
# Bootstrap sertifikat Let's Encrypt untuk app.<domain> & api.<domain>.
# Jalankan SEKALI di VPS (dari direktori yang berisi docker-compose.yml & .env),
# SETELAH DNS A-record kedua subdomain mengarah ke IP server ini:
#
#   ./deploy/init-letsencrypt.sh
#
# Mengikuti pola umum: buat cert dummy dulu agar nginx bisa start, lalu minta
# cert asli via tantangan webroot, lalu reload nginx.
set -euo pipefail

# Muat variabel dari .env
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

: "${APP_DOMAIN:?APP_DOMAIN belum diset di .env}"
: "${API_DOMAIN:?API_DOMAIN belum diset di .env}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL belum diset di .env}"

domains=("$APP_DOMAIN" "$API_DOMAIN")
rsa_key_size=4096
staging="${LETSENCRYPT_STAGING:-0}"   # set 1 untuk uji coba (hindari rate limit)
compose="docker compose"

echo "### 1/4 Membuat sertifikat dummy sementara ..."
for d in "${domains[@]}"; do
  path="/etc/letsencrypt/live/$d"
  $compose run --rm --entrypoint "\
    sh -c 'mkdir -p $path && openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout $path/privkey.pem -out $path/fullchain.pem -subj /CN=localhost'" certbot
done

echo "### 2/4 Menjalankan nginx ..."
$compose up -d nginx

echo "### 3/4 Menghapus dummy & meminta sertifikat asli ..."
for d in "${domains[@]}"; do
  $compose run --rm --entrypoint "\
    sh -c 'rm -rf /etc/letsencrypt/live/$d /etc/letsencrypt/archive/$d /etc/letsencrypt/renewal/$d.conf'" certbot
done

staging_arg=""
[ "$staging" != "0" ] && staging_arg="--staging"

for d in "${domains[@]}"; do
  $compose run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot $staging_arg \
      --email $LETSENCRYPT_EMAIL -d $d \
      --rsa-key-size $rsa_key_size --agree-tos --no-eff-email --force-renewal" certbot
done

echo "### 4/4 Reload nginx ..."
$compose exec nginx nginx -s reload

echo "### Selesai. Sertifikat untuk ${domains[*]} aktif."
echo "    Lanjutkan dengan: docker compose up -d"
