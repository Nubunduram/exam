# Mini e-commerce MERN

Boutique en ligne : catalogue, panier (Context API), commande avec choix du transporteur et du paiement, suivi des commandes, administration (commandes, stocks) et notifications email via microservice.

| | Production | Pré-production |
|---|---|---|
| Site | https://exam-domain-name.duckdns.org | https://preprod.exam-domain-name.duckdns.org |
| API | https://api.exam-domain-name.duckdns.org/api | https://api.preprod.exam-domain-name.duckdns.org/api |
| Supervision | https://status.exam-domain-name.duckdns.org | |

## Architecture

| Dossier | Rôle | Port |
|---|---|---|
| `frontend/` | React 18 + React Router + Tailwind, servi par nginx | 8080 (conteneur) |
| `backend/` | API REST Express + Mongoose (MongoDB) | 5000 |
| `gateway/` | Point d'entrée des microservices (`/notify`, `/update-stock`) | 8000 |
| `microservices/notifications/` | Envoi d'emails (Nodemailer) | 4002 |
| `microservices/stock-management/` | Gestion de stock (événements) | 4003 |
| `deploy/` | Fichiers de déploiement serveur (compose, Caddy, scripts) | |

## Démarrage local (Docker)

```bash
cp .env.example .env         # puis renseigner JWT_SECRET (et EMAIL_* pour les mails)
docker compose up -d --build
docker compose exec backend node seeder.js           # jeu de produits
docker compose exec -e ADMIN_USERNAME=admin -e ADMIN_EMAIL=admin@local.test \
  -e ADMIN_PASSWORD='MotDePasseFort123' backend node createAdmin.js
```
Frontend : http://localhost:3000, API : http://localhost:5000/api/health

## API

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/health` | public | État de l'API et de MongoDB |
| GET | `/api/products` | public | Catalogue |
| PUT | `/api/products/:productId/stock` | admin | Mise à jour du stock |
| POST | `/api/auth/register` | public (rate-limit) | Inscription |
| POST | `/api/auth/login` | public (rate-limit) | Connexion (cookie httpOnly) |
| GET | `/api/auth/me` | connecté | Utilisateur courant |
| POST | `/api/auth/logout` | public | Déconnexion |
| POST | `/api/orders` | connecté | Créer une commande (prix calculé serveur) |
| GET | `/api/orders/mine` | connecté | Mes commandes |
| GET | `/api/orders` | admin | Toutes les commandes |
| PUT | `/api/orders/:id/validate` | admin | Valider une commande |
| PUT | `/api/orders/:orderId/status` | admin | Changer le statut |
| DELETE | `/api/orders/:id` | admin | Supprimer une commande |

## Qualité

```bash
npm --prefix backend test                               # 25 tests API (sécurité, validation, accès)
CI=true npm --prefix frontend test -- --watchAll=false  # 12 tests (panier, formulaires)
npm --prefix backend run docs                           # documentation JSDoc -> docs/api/
```

## Documentation
- Documentation du code backend (JSDoc) : `docs/api/index.html`
- Journal des évolutions : [CHANGELOG.md](CHANGELOG.md)
- Rapport d'exploitation (hébergement, CI/CD, supervision) : [RAPPORT.md](RAPPORT.md)
