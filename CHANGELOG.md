# Journal des évolutions (Changelog)

Toutes les évolutions notables du projet sont consignées dans ce fichier.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).
Catégories : **Ajouté**, **Modifié**, **Corrigé** (bugs, E27), **Sécurité** (failles, E28), **Supprimé**.

---

## [2.0.0] - 2026-11-03 : robustesse, sécurité et documentation

> Version majeure : l'authentification passe d'un token en `localStorage` à un cookie de session httpOnly
> (les anciens clients doivent se reconnecter), et l'API refuse désormais les champs `price` / `total` comme source de calcul.

### Sécurité (E28)
| # | Faille constatée | Risque | Correction |
|---|---|---|---|
| S1 | **Prix et total envoyés par le client** et enregistrés tels quels (`POST /api/orders`) | Achat d'un ordinateur à 0,01 € | Prix relus en base, total recalculé côté serveur ; champs `price`/`total` du client ignorés |
| S2 | **Injection NoSQL** au login : `{"username":{"$ne":null}}` passé directement à `User.findOne` | Contournement de requêtes, énumération | Validation Joi stricte (chaînes uniquement) + `mongoose.set('sanitizeFilter', true)` ; opérateurs serveur marqués `mongoose.trusted()` |
| S3 | **`DELETE /api/orders/:id` sans `isAdmin`** | N'importe quel client pouvait appeler une route d'administration | Route réservée aux administrateurs + validation de l'identifiant |
| S4 | **JWT stocké en `localStorage`** (et affiché dans la console du navigateur) | Vol de session par XSS | Cookie `httpOnly`, `secure`, `sameSite=strict`, durée 1 h ; routes `/auth/me` et `/auth/logout` ; `withCredentials` côté client |
| S5 | **Aucune validation des entrées** (formulaires vides, types, longueurs, `role` injectable) | Données corrompues, crash, élévation de privilège | Schémas **Joi** sur toutes les routes (inscription, connexion, commande, statut, stock, identifiants), champs inconnus rejetés |
| S6 | **Injection HTML/JS** (`<script>alert('test')</script>`) acceptée dans le nom d'utilisateur | XSS stocké potentiel | Nom limité à `[a-zA-Z0-9]{3,30}` (serveur + client) ; React échappe tout affichage ; messages rendus dans un composant `Alert` (pas de HTML brut) |
| S7 | **Mots de passe faibles** acceptés | Comptes compromis | 8 caractères min. avec majuscule, minuscule et chiffre ; mot de passe admin de 12 caractères min. |
| S8 | **Brute force** possible sur `/login` et `/register` | Devinette des mots de passe | `express-rate-limit` : 10 tentatives / 15 min / IP |
| S9 | **Énumération des comptes** (« Utilisateur non trouvé » vs « Mot de passe incorrect ») et temps de réponse différent | Découverte des identifiants valides | Message unique « Nom d'utilisateur ou mot de passe incorrect », comparaison bcrypt systématique (temps constant) |
| S10 | **CORS ouvert à toutes les origines** (`cors()`) | Appels depuis n'importe quel site | Liste blanche `CORS_ORIGIN` par environnement, `credentials: true` |
| S11 | **En-têtes HTTP de sécurité absents**, `X-Powered-By: Express` exposé | Empreinte du serveur, clickjacking | `helmet` sur l'API ; HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` sur Caddy |
| S12 | **Microservice `/notify` sans authentification** | Relais d'emails ouvert (spam depuis le compte Gmail) | Réseau Docker interne uniquement + clé partagée `x-api-key` (comparaison à temps constant) + validation des champs (anti-injection d'en-têtes) |
| S13 | **Secrets dans les logs** : mot de passe en clair (debug), token JWT, URI MongoDB, **mot de passe SMTP** au démarrage | Fuite d'identifiants | Logs supprimés / remplacés par Winston sans données sensibles |
| S14 | **Robustesse du `JWT_SECRET`** | Signature de faux tokens | Secret de 96 caractères aléatoires distinct par environnement ; l'API refuse de démarrer si < 32 caractères ; algorithme `HS256` imposé à la vérification |
| S15 | **Dépendances vulnérables** (`npm audit` : 100 vulnérabilités dont 10 critiques) | Exploits connus | `npm audit fix`, nodemailer 7, axios, react-router 6.30 ; outils de build en `devDependencies` ; audit bloquant dans le CI (rapports dans `docs/audit/`) |
| S16 | Rôle utilisateur non contraint dans le modèle | Valeurs de rôle arbitraires | `role` : enum `user` / `admin`, imposé à `user` à l'inscription |

### Corrigé (E27)
| # | Bug constaté | Correction |
|---|---|---|
| B1 | La **Navbar ne se mettait pas à jour** après connexion/déconnexion (lecture de `localStorage` au rendu) | `AuthContext` partagé : affichage immédiat de « Bonjour, … », du lien Administration et du bouton Déconnexion |
| B2 | La déconnexion laissait le **rôle** en `localStorage` | Session gérée par cookie, supprimé côté serveur (`/auth/logout`) |
| B3 | **Méthode de livraison / paiement « manquante »** alors qu'une valeur était affichée dans la liste (état `null` vs option affichée) | Option vide « Choisir… » synchronisée avec l'état |
| B4 | `deleteOrder` ne renvoyait **jamais de réponse** (requête bloquée) et ne supprimait rien | Suppression effective, restitution du stock, réponse 200/404 |
| B5 | `validateOrder` lisait `req.body.orderId` (undefined) et **ne modifiait pas la commande** | Utilise `:id`, passe la commande « En cours de traitement » |
| B6 | `getOrders` / `getProducts` **sans try/catch** : une panne MongoDB faisait planter la requête | Gestion d'erreurs + gestionnaire global (404, JSON invalide, 500 sans stack) |
| B7 | `adminRoutes` **jamais monté** ; `adminController` visait `localhost:3001` et un statut `Validée` absent de l'enum | Code mort supprimé ; routes admin regroupées dans `orderRoutes` / `productRoutes` |
| B8 | **Stock jamais décrémenté** à la commande ; quantités supérieures au stock acceptées | Réservation atomique (`stock >= quantité`), message « Stock insuffisant », bornage dans le panier |
| B9 | **Formulaires vides** envoyés au serveur (login, inscription, adresse) avec retour peu clair (`alert`, 500) | Validation client + serveur, messages précis affichés dans la page |
| B10 | Nom d'utilisateur en **doublon** : erreur 500 générique | Vérification préalable + code 409 explicite |
| B11 | Admin : **stock 0 refusé** (`!stockValue`), valeur stockée en texte | Entier >= 0 accepté, conversion numérique, mise à jour depuis la réponse serveur |
| B12 | **`key` React undefined** (`product.id`) : warning console | `key={product._id}` |
| B13 | Reducer du panier qui **mutait l'état** ; panier **perdu au rafraîchissement** | Reducer immuable + persistance `localStorage` (panier seulement, aucune donnée sensible) |
| B14 | Après commande : pas de redirection, test `response.error` inopérant | Écran de confirmation avec total serveur, panier vidé, redirection vers /login si session expirée |
| B15 | Route `shippig_payment` (coquille) **non protégée** | Route `/shipping-payment` protégée, validation de l'étape avant la synthèse |
| B16 | Composant `components/ProductList.js` dupliquant `ProtectedRoute` | Supprimé |
| B17 | Emails de notification envoyés à une adresse codée en dur (`syaob@yahoo.fr`) | Email de confirmation au client + alerte boutique configurable (`ORDER_NOTIFY_EMAIL`) ; email au client à chaque changement de statut |
| B18 | Double soumission possible des formulaires | Boutons désactivés pendant l'envoi |
| B20 | Journal d'accès HTTP (morgan) masqué en production : niveau de log `info` supérieur au niveau `http` | Niveau par défaut `http` en production |
| B19 | `CartContext` : `SET_SHIPPING_ADDRESS` remplaçait l'adresse entière ; état local dupliqué dans `ShippingAddress` | Fusion des champs, composant contrôlé par le contexte |

### Ajouté
- Route `GET /api/orders/mine` (commandes de l'utilisateur), `GET /api/auth/me`, `POST /api/auth/logout`.
- Administration : actions « Marquer Délivrée », « Annuler », « Supprimer », nom des produits et adresse dans les détails.
- Catalogue : affichage du stock, bouton désactivé en rupture, confirmation d'ajout au panier.
- Composant `Alert` (retours utilisateur accessibles, sans `alert()` bloquant).
- **Tests** : 25 tests API (`node:test` + `supertest`) couvrant sécurité, validation et contrôle d'accès ; 12 tests frontend (reducer, formulaires, étapes de commande). Exécutés dans le CI.
- **Qualité du code** : ESLint (`eslint.config.js`, règles recommandées + `eqeqeq`, `no-var`, `prefer-const`) et Prettier (`.prettierrc.json`) ; `npm run lint` / `npm run format` ; job « Lint » bloquant dans le CI.
- **Documentation** : JSDoc sur tout le backend (modules, contrôleurs, middlewares, modèles, validateurs), générée dans `docs/api/` (`npm --prefix backend run docs`) ; commentaires des composants React ; `README.md`.

### Supprimé
- `backend/routes/adminRoutes.js`, `backend/controllers/adminController.js` (jamais montés, bogués).
- Dépendance `debug` (remplacée par Winston), `body-parser` (intégré à Express).

---

## [1.1.0] - 2026-11-03 : mise en production

### Ajouté
- **Conteneurisation** : Dockerfiles (multi-stage, non-root, healthcheck) pour les 5 services ; `docker-compose.yml` local avec MongoDB ; stacks de déploiement par environnement.
- **Hébergement** : VM GCP e2-micro (Debian 12) sécurisée (UFW, SSH par clé, fail2ban, mises à jour automatiques) ; MongoDB Atlas (une base et un utilisateur par environnement).
- **DNS / HTTPS** : `exam-domain-name.duckdns.org` + sous-domaines, certificats Let's Encrypt automatiques via Caddy.
- **CI/CD** GitHub Actions : tests, audit, build et push GHCR, déploiement SSH, test de fumée HTTPS ; `development` → pré-production, `main` → production.
- **Journalisation** : Winston + morgan (JSON, rotation, journal d'audit), Dozzle.
- **Supervision** : Uptime Kuma v2 (sondes santé API + base, frontends, alertes email, expiration des certificats) ; endpoints `/health`.

### Modifié
- URL des services configurables par variables d'environnement (`REACT_APP_API_URL`, `NOTIFY_URL`, `CORS_ORIGIN`…).
- Mise à jour de `nodemailer` (7), `axios` et `react-router-dom` 6.30 (correctifs de sécurité).

### Corrigé
- Dossier `frontend/` versionné comme un sous-module vide (dépôt Git imbriqué).
- `docker-compose.yml` initial inutilisable (Dockerfiles absents, mauvais ports, gateway manquante, MongoDB exposé).

---

## [1.0.0] - version initiale fournie
- Application MERN : catalogue, panier (Context API), commande, rôles user/admin, gateway, microservices notifications et stock.
