# Rapport d'examen : mise en production et maintenance applicative

**Application** : mini site e-commerce MERN (React, Node/Express, MongoDB, gateway, microservices notifications et stock)
**Dépôt** : https://github.com/Nubunduram/exam (branches `development` → préproduction, `main` → production)

| Environnement | Frontend | API | Supervision |
|---|---|---|---|
| **Production** | https://exam-domain-name.duckdns.org | https://api.exam-domain-name.duckdns.org/api/health | https://status.exam-domain-name.duckdns.org |
| **Pré-production** | https://preprod.exam-domain-name.duckdns.org | https://api.preprod.exam-domain-name.duckdns.org/api/health | (même instance) |
| Logs | https://logs.exam-domain-name.duckdns.org (Dozzle, accès protégé) | | |

---

## Architecture déployée

```
                         Internet (HTTPS 443 / HTTP 80 → redirection)
                                         │
                       ┌─────────────────▼──────────────────┐
  VM GCP e2-micro      │  Caddy (reverse proxy + Let's Encrypt)│
  Debian 12            └──┬──────────┬──────────┬──────────┬──┘
  UFW : 22/80/443         │          │          │          │      réseau Docker "proxy"
                   prod-frontend prod-backend preprod-*  uptime-kuma / dozzle
                     (nginx)      (Express)
                                    │  réseau Docker interne (par environnement, non exposé)
                         ┌──────────┼───────────────┐
                      gateway → notifications   stock-management
                                    │
                         MongoDB Atlas (M0, GCP us-central1)
                         bases exam_prod / exam_preprod, 1 utilisateur par base,
                         accès réseau limité à l'IP de la VM
```

---

## Séquence des tâches réalisées

### Étape 0 : hygiène du dépôt
1. Le dossier `frontend/` contenait son propre `.git` : le dépôt parent l'indexait comme un sous-module vide, donc le code du front n'était pas versionné. Suppression du dépôt imbriqué et ré-indexation des fichiers.
2. Ajout de `.gitattributes` (fins de ligne LF, indispensables aux conteneurs Linux) et de fichiers `.env.example`. Les vrais `.env` restent ignorés.
3. Création des branches `main` (production) et `development` (préproduction), push sur GitHub.

### Étape 1 : préparation du code au déploiement
- URL codées en dur (`http://localhost:5000`, `localhost:3001`, `localhost:8000`) remplacées par des variables d'environnement : `REACT_APP_API_URL` (injectée au build du frontend), `NOTIFY_URL`, `*_SERVICE_URL`, `CORS_ORIGIN`.
- Sondes de santé : `GET /api/health` (backend, vérifie l'état de la connexion MongoDB, répond 503 si la base est indisponible) et `GET /health` (gateway et microservices).
- Gestionnaire d'erreurs global Express : pas de crash, pas de stack renvoyée au client.

### Étape 2 : conteneurisation (E24)
- Un **Dockerfile** par service (backend, gateway, notifications, stock-management) :
  - image `node:22-alpine` ;
  - `npm ci --omit=dev`, pour n'embarquer que les dépendances de production ;
  - exécution en utilisateur **non-root** (`USER node`) ;
  - `HEALTHCHECK`.
- Frontend : **build multi-stage**. Une étape Node construit l'application React, puis `nginx-unprivileged` sert les fichiers statiques (port 8080, non-root, fallback SPA, cache des assets).
- `docker-compose.yml` (local) : toute la stack + **MongoDB** conteneurisé, avec volume persistant et healthcheck. Les ports internes ne sont pas exposés, Mongo n'écoute que sur `127.0.0.1`.
- `deploy/docker-compose.app.yml` (serveur) : même stack, mais avec les images de GHCR, une instance par environnement (`-p exam-preprod` et `-p exam-prod`) et des limites mémoire.
- `deploy/infra/docker-compose.yml` : Caddy, Uptime Kuma, Dozzle, partagés par les deux environnements.

### Étape 3 : hébergement et sécurisation du serveur (E21, E22)
Script `deploy/server-setup.sh` (idempotent) sur la VM GCP :
1. Swap de 2 Go (la VM n'a que 1 Go de RAM).
2. Mises à jour système et **mises à jour de sécurité automatiques** (`unattended-upgrades`).
3. Docker Engine et plugin Compose depuis le dépôt officiel Docker, rotation des logs Docker.
4. **Utilisateur dédié `deploy`**, membre du groupe docker, authentifié uniquement par **clé SSH ed25519 dédiée** à GitHub Actions.
5. **Durcissement SSH** : `PermitRootLogin no`, `PasswordAuthentication no`, `MaxAuthTries 3`.
6. **Pare-feu UFW** : seuls les ports 22, 80 et 443 sont ouverts, en plus du pare-feu VPC de GCP.
7. **Fail2ban** sur SSH : bannissement de 1 h après 5 échecs.

Les secrets sont créés par `deploy/init-env.sh` :
- saisie masquée des mots de passe ;
- `JWT_SECRET` généré aléatoirement (`openssl rand -hex 48`), **différent par environnement** ;
- fichiers `/opt/exam/<env>/.env` en `chmod 600`, propriétaire `deploy` ;
- jamais commités.

### Étape 4 : nom de domaine, DNS et HTTPS (E23)
- Domaine `exam-domain-name.duckdns.org` (DuckDNS, gratuit). L'enregistrement A pointe vers l'IP de la VM (`35.188.148.90`), et DuckDNS résout automatiquement tous les sous-domaines (`api.`, `preprod.`, `api.preprod.`, `status.`, `logs.`).
- **Caddy** obtient et renouvelle automatiquement les certificats **Let's Encrypt** (challenge HTTP-01) pour les 6 hôtes, et redirige HTTP vers HTTPS (308).
- En-têtes de sécurité ajoutés : HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. La préprod porte en plus `X-Robots-Tag: noindex`.
- Vérification : émetteur `Let's Encrypt (YE1)`, expiration le 1er février 2027, pour chaque sous-domaine.
- *Incident résolu* : la première demande de certificat a échoué (`contact email contains non-ASCII characters`). Un caractère invisible s'était glissé dans l'email de contact lors d'un copier-coller. J'ai nettoyé le fichier `.env` et recréé Caddy, et les certificats ont été obtenus en moins d'une minute.

### Étape 5 : CI/CD (E24)
Workflow `.github/workflows/ci-cd.yml` (GitHub Actions) :
1. **Test & audit** (matrice des 5 services) : `npm ci`, vérification syntaxique, tests unitaires (reducer du panier, 5 tests), `npm audit --audit-level=critical` bloquant.
2. **Build & push** : `docker buildx`, push sur **GitHub Container Registry**. Tags `preprod` ou `prod` + tag immuable `<env>-<sha>` pour pouvoir revenir en arrière. L'URL de l'API est injectée au build selon la branche, et un cache est utilisé entre les builds.
3. **Déploiement** (environnements GitHub `preprod` et `production`) :
   - copie SCP des fichiers compose ;
   - démarrage ou rechargement de l'infrastructure ;
   - `docker compose pull` puis `up -d` via SSH avec l'utilisateur `deploy` ;
   - nettoyage des images ;
   - verrou de concurrence (un seul déploiement à la fois par environnement).
4. **Test de fumée** : appel HTTPS de `/api/health` après le déploiement. Le pipeline échoue si l'API ne répond pas.

Flux : `git push development` → préproduction ; fusion dans `main` → production.

### Étape 6 : journalisation et audit (E25)
- **Winston** dans les 4 services Node : logs **JSON** horodatés avec le service et l'environnement, niveau `info` en production, sortie console (collectée par Docker) et fichiers `error.log`, `combined.log` avec rotation (5 × 5 Mo).
- **morgan** : journal d'accès HTTP (format *combined*) redirigé vers Winston.
- **Journal d'audit** dédié (`audit.log`) : connexions réussies et échouées (avec la raison et l'IP), inscriptions, créations de commande, changements de statut, mises à jour de stock, accès admin refusés.
- **Suppression des fuites dans les logs** : mot de passe en clair (debug de `authController`), token JWT (middleware et frontend), URI MongoDB, **mot de passe SMTP** affiché au démarrage du service notifications.
- Rotation des logs Docker (`max-size 10m`, `max-file 3`).
- **Dozzle** : consultation des logs de tous les conteneurs en temps réel, protégée par authentification (bcrypt).
- **Audit des dépendances** : `npm audit` dans le CI. Les rapports avant correction sont dans `docs/audit/`.

| Service | Avant | Après |
|---|---|---|
| backend | 10 (3 critiques) | 0 |
| gateway | 5 (1 critique) | 0 |
| notifications | 6 (1 critique) | 0 (nodemailer 6 → 7) |
| stock-management | 5 (1 critique) | 0 |
| frontend (runtime) | 74 (4 critiques) | 1 modérée (react-router 6, corrigée uniquement en v7) |

### Étape 7 : supervision et alertes (E26)
- **Uptime Kuma v2**. La v1, d'abord déployée, a été remplacée car elle n'est plus maintenue.
  - Sondes *mot-clé* sur `/api/health` (`"database":"up"`) pour la prod et la préprod : elles détectent à la fois une panne de l'API **et** une perte de connexion à MongoDB Atlas.
  - Sondes HTTP sur les frontends.
  - Sonde métier sur le catalogue produits.
  - Sondes **conteneurs Docker** pour la gateway et les microservices, qui ne sont pas exposés sur Internet.
  - Alerte d'**expiration des certificats** à 21, 14 et 7 jours.
  - 3 tentatives avant alerte, pour éviter les faux positifs.
  - Notification par email ou ntfy.
  - Page de statut publique.
- **Healthchecks Docker** sur chaque conteneur, avec redémarrage automatique (`restart: unless-stopped`).
- **Google Cloud Ops Agent** (préinstallé) : métriques système (CPU, RAM, disque) dans Cloud Monitoring.

---

## Réponses au formulaire (E21 à E26)

### E21 : choix de l'hébergement et environnement de pré-production
J'ai choisi **Google Cloud Platform** (Compute Engine e2-micro, offre gratuite permanente, Debian 12) avec **MongoDB Atlas** M0 dans la même région (us-central1). Critères retenus :
- **coût** : gratuit et durable, contrairement aux essais limités de Railway ou de Render ;
- **contrôle et sécurité** : un vrai serveur permet un réseau Docker privé pour la gateway et les microservices (non exposés), ainsi qu'un pare-feu, SSH par clé et fail2ban. Les PaaS gratuits exposent chaque service publiquement et mettent les instances en veille ;
- **maintenance** : tout est décrit en code (docker compose, scripts), donc reproductible ;
- **performance** : Atlas est dans le même datacenter que la VM (faible latence). Les builds se font dans GitHub Actions, pas sur la VM.

Limite assumée : 1 Go de RAM, compensé par 2 Go de swap, des limites mémoire par conteneur et des images légères (alpine).

La **pré-production** est une instance complète et isolée de la stack : projet compose `exam-preprod`, base `exam_preprod` avec son propre utilisateur Atlas, `JWT_SECRET` distinct, sous-domaines `preprod.` et `api.preprod.`, en-tête `noindex`. Elle est déployée automatiquement à chaque push sur `development`.

### E22 : production sécurisée et administration
La production (projet compose `exam-prod`, base `exam_prod`) tourne sur la même VM, isolée de la préprod par réseau Docker, base de données, utilisateur de base et secrets. Sécurisation :
- **système** : UFW (22/80/443 uniquement), SSH par clé uniquement, root interdit, fail2ban, mises à jour de sécurité automatiques, utilisateur `deploy` dédié au déploiement ;
- **conteneurs** : utilisateurs non-root, dépendances de prod uniquement, healthchecks, redémarrage automatique, limites mémoire, seuls Caddy (80/443) et le frontend et l'API (via Caddy) sont exposés ;
- **données** : MongoDB Atlas en TLS, un utilisateur `readWrite` par base, liste d'accès IP limitée à la VM ;
- **secrets** : `.env` en `600` sur le serveur, jamais dans Git, JWT de 96 caractères aléatoires par environnement, secrets SSH dans GitHub Secrets.

Administration : Dozzle (logs), Uptime Kuma (état), `docker compose` via l'utilisateur `deploy`, scripts `createAdmin.js` et `seeder.js`.

### E23 : domaine, DNS, certificats
Domaine **exam-domain-name.duckdns.org** (DuckDNS) : enregistrement A vers `35.188.148.90`, avec résolution automatique des sous-domaines.
- Production : `exam-domain-name.duckdns.org` et `api.exam-domain-name.duckdns.org`
- Préproduction : `preprod.…` et `api.preprod.…`
- Outils : `status.…` et `logs.…`

Les certificats **Let's Encrypt** sont obtenus et renouvelés automatiquement par **Caddy** (HTTP-01), avec redirection HTTP vers HTTPS et HSTS. Vérification avec `openssl s_client` (émetteur Let's Encrypt YE1, valide jusqu'au 01/02/2027) et dans le navigateur (cadenas). Uptime Kuma alerte avant l'expiration.

### E24 : CI/CD
Pipeline **GitHub Actions** :
1. **CI** : installation, vérification syntaxique, tests unitaires, `npm audit` bloquant sur les failles critiques.
2. **Build** des 5 images Docker et **push sur GHCR** (tags `preprod` ou `prod` + SHA du commit pour le retour arrière).
3. **CD** via SSH (utilisateur `deploy`, clé dédiée) : `docker compose pull` puis `up -d`.
4. **Test de fumée HTTPS** sur `/api/health`.

Push sur `development` → préproduction. Fusion dans `main` → production. Environnements GitHub distincts, verrou de concurrence.

### E25 : journalisation et audit
**Winston** + **morgan** dans tous les services Node : logs JSON structurés, niveaux, fichiers avec rotation et journal d'**audit** séparé (connexions réussies et échouées, inscriptions, commandes, actions admin, accès refusés). J'ai supprimé les logs qui exposaient des secrets (mots de passe, JWT, mot de passe SMTP, URI Mongo). Les logs Docker sont en rotation, et **Dozzle** permet de les consulter, protégé par mot de passe. Côté audit des dépendances, `npm audit` tourne dans le CI : on passe de 100 failles (dont 10 critiques) à 1 modérée. Les images d'infrastructure ont des versions maintenues et fixées.

### E26 : supervision et alertes
**Uptime Kuma v2** surveille les deux environnements :
- `/api/health` par mot-clé (API **et** base de données) ;
- les frontends ;
- un parcours métier (catalogue) ;
- les conteneurs internes (gateway, notifications, stock) via le socket Docker ;
- l'expiration des certificats.

Les alertes partent par email ou ntfy après 3 échecs consécutifs, ce qui limite les faux positifs. Une page de statut publique est disponible. Les healthchecks Docker redémarrent automatiquement les services défaillants. Le Google Cloud Ops Agent remonte les métriques système (CPU, RAM, disque).

---

## Captures d'écran à joindre
1. Console GCP : VM e2-micro (et règles de pare-feu)
2. Sortie de `server-setup.sh` (UFW, Docker, swap)
3. DuckDNS : domaine et IP
4. MongoDB Atlas : cluster, utilisateurs, accès réseau
5. GitHub Actions : pipeline vert préprod et prod
6. GHCR : packages des images
7. Navigateur : cadenas et certificat Let's Encrypt (prod et préprod)
8. `/api/health` prod et préprod
9. Uptime Kuma : tableau de bord et page de statut
10. Dozzle : logs JSON et lignes d'audit

## Accès (transmis séparément, jamais versionnés)
| Ressource | Identifiant | Secret |
|---|---|---|
| Admin application, production | `admin` | *fourni séparément* |
| Admin application, préproduction | `admin` | *fourni séparément* |
| Uptime Kuma | *à compléter* | *fourni séparément* |
| Dozzle (logs) | `admin` | *fourni séparément* |
| VM GCP (SSH) | via la console GCP | accès au projet à partager |
| MongoDB Atlas | *invitation au projet* | |
