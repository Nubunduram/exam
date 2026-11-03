#!/usr/bin/env bash
# =============================================================================
# Installation et sécurisation du serveur (Debian 12 "bookworm" - GCP e2-micro)
# Usage (depuis la console SSH de la VM) :  sudo bash server-setup.sh
# Idempotent : peut être relancé sans risque.
# =============================================================================
set -euo pipefail

DEPLOY_USER=deploy
APP_ROOT=/opt/exam

echo "==> 1. Mises à jour système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades apache2-utils

echo "==> 2. Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> 3. Swap de 2 Go (la VM n'a que 1 Go de RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

echo "==> 4. Installation de Docker Engine + plugin Compose (dépôt officiel)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Rotation des logs Docker par défaut
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl enable --now docker
systemctl restart docker

echo "==> 5. Utilisateur de déploiement dédié (utilisé par GitHub Actions)"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /home/$DEPLOY_USER/.ssh
touch /home/$DEPLOY_USER/.ssh/authorized_keys
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
chown "$DEPLOY_USER:$DEPLOY_USER" /home/$DEPLOY_USER/.ssh/authorized_keys

echo "==> 6. Arborescence applicative"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_ROOT" "$APP_ROOT/preprod" "$APP_ROOT/prod" "$APP_ROOT/infra"
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy

echo "==> 7. Durcissement SSH (clé uniquement, pas de root)"
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF
sshd -t && systemctl reload ssh

echo "==> 8. Pare-feu UFW : uniquement SSH, HTTP, HTTPS"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> 9. Fail2ban (bannit les IP après échecs SSH répétés)"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo
echo "Installation terminée."
docker --version
docker compose version
ufw status | head -8
free -h | head -3
