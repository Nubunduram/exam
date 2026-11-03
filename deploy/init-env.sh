#!/usr/bin/env bash
# =============================================================================
# Création des fichiers .env du serveur (préprod, prod, infra).
# Les secrets sont saisis de façon masquée ou générés aléatoirement :
# ils ne sont jamais commités ni affichés.
# Usage :  sudo bash init-env.sh
# =============================================================================
set -euo pipefail

APP_ROOT=/opt/exam
DOMAIN=exam-domain-name.duckdns.org
DEPLOY_USER=deploy
# Hôtes du cluster MongoDB Atlas (non secrets)
MONGO_HOSTS="ac-8uvvh7z-shard-00-00.3n2cgcv.mongodb.net:27017,ac-8uvvh7z-shard-00-01.3n2cgcv.mongodb.net:27017,ac-8uvvh7z-shard-00-02.3n2cgcv.mongodb.net:27017"
MONGO_OPTS="ssl=true&replicaSet=atlas-14c2g7-shard-0&authSource=admin&retryWrites=true&w=majority"

ask_secret() { local v; read -r -s -p "$1 : " v; echo >&2; printf '%s' "$v"; }
ask() { local v; read -r -p "$1 : " v; printf '%s' "$v"; }
urlencode() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1"; }
gen_secret() { openssl rand -hex 48; }

echo "=== Secrets MongoDB Atlas ==="
MONGO_PREPROD_PWD=$(ask_secret "Mot de passe Atlas de l'utilisateur exam_preprod")
MONGO_PROD_PWD=$(ask_secret "Mot de passe Atlas de l'utilisateur exam_prod")

echo "=== Notifications email (laisser vide si indisponible) ==="
EMAIL_USER=$(ask "Adresse Gmail d'envoi (EMAIL_USER)")
EMAIL_PWD=$(ask_secret "Mot de passe d'application Gmail")
ORDER_EMAIL=$(ask "Adresse qui reçoit les alertes de commande")

echo "=== Infrastructure ==="
ACME_EMAIL=$(ask "Email de contact Let's Encrypt")
LOGS_PWD=$(ask_secret "Mot de passe à définir pour l'interface des logs (Dozzle)")

write_env() { # $1=env  $2=mongo user  $3=mongo pwd  $4=origin
  local dir="$APP_ROOT/$1"
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$dir"
  umask 077
  cat > "$dir/.env" <<EOF
APP_ENV=$1
IMAGE_TAG=$1
MONGO_URI=mongodb://$2:$(urlencode "$3")@${MONGO_HOSTS}/exam_$1?${MONGO_OPTS}
JWT_SECRET=$(gen_secret)
NOTIFY_API_KEY=$(openssl rand -hex 32)
CORS_ORIGIN=$4
EMAIL_USER=${EMAIL_USER}
EMAIL_APPLICATION_PASSWORD=${EMAIL_PWD}
ORDER_NOTIFY_EMAIL=${ORDER_EMAIL}
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$dir/.env"
  chmod 600 "$dir/.env"
  echo "  -> $dir/.env créé"
}

write_env preprod exam_preprod "$MONGO_PREPROD_PWD" "https://preprod.${DOMAIN}"
write_env prod    exam_prod    "$MONGO_PROD_PWD"    "https://${DOMAIN}"

echo "=== Hash du mot de passe Dozzle (bcrypt via l'image Caddy) ==="
LOGS_HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$LOGS_PWD")
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_ROOT/infra"
umask 077
cat > "$APP_ROOT/infra/.env" <<EOF
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
LOGS_USER=admin
LOGS_PASSWORD_HASH='${LOGS_HASH}'
EOF
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/infra/.env"
chmod 600 "$APP_ROOT/infra/.env"
echo "  -> $APP_ROOT/infra/.env créé"

echo
echo "Terminé. Vérification (droits et variables, sans les valeurs) :"
for f in "$APP_ROOT"/{preprod,prod,infra}/.env; do
  echo "$(stat -c '%A %U' "$f") $f : $(cut -d= -f1 "$f" | tr '\n' ' ')"
done
