# Captures d'écran

Captures illustrant chaque étape de l'examen (E21 à E29), nommées par numéro de compétence.

> ⚠️ Ne jamais capturer un mot de passe, un fichier `.env`, un token ou une clé. Masquer si nécessaire.

## E21 : hébergement et pré-production
| Fichier | Contenu à capturer |
|---|---|
| `E21-01-gcp-vm.png` | Console GCP → Compute Engine → Instances : VM `exam-server` (e2-micro, us-central1, IP externe) |
| `E21-02-atlas-cluster.png` | MongoDB Atlas → Clusters : cluster M0 (fournisseur GCP, région Iowa) |
| `E21-03-preprod-accueil.png` | https://preprod.exam-domain-name.duckdns.org : liste des produits, avec l'URL visible |

## E22 : production sécurisée
| Fichier | Contenu à capturer |
|---|---|
| `E22-01-server-setup.png` | Fin de la sortie de `sudo bash server-setup.sh` (Docker, UFW actif 22/80/443, swap) |
| `E22-02-gcp-firewall.png` | GCP → Réseau VPC → Pare-feu : règles HTTP/HTTPS |
| `E22-03-atlas-users.png` | Atlas → Database Access : utilisateurs `exam_prod` et `exam_preprod` (readWrite sur leur base) |
| `E22-04-atlas-network.png` | Atlas → Network Access : uniquement l'IP de la VM `35.188.148.90/32` |
| `E22-05-prod-accueil.png` | https://exam-domain-name.duckdns.org : liste des produits |
| `E22-06-prod-admin.png` | Page `/admin` de la production, connecté en admin |

## E23 : domaine, DNS, HTTPS
| Fichier | Contenu à capturer |
|---|---|
| `E23-01-duckdns.png` | duckdns.org : domaine `exam-domain-name` et son IP |
| `E23-02-certificat-prod.png` | Navigateur sur la prod : clic sur le cadenas → certificat (émis par Let's Encrypt, dates de validité) |
| `E23-03-certificat-preprod.png` | Même chose sur la pré-production |
| `E23-04-health-https.png` | https://api.exam-domain-name.duckdns.org/api/health affichant `"database":"up"` |

## E24 : CI/CD et conteneurisation
| Fichier | Contenu à capturer |
|---|---|
| `E24-01-actions-liste.png` | GitHub → Actions : liste des exécutions vertes (branches `main` et `development`) |
| `E24-02-pipeline-prod.png` | Détail d'une exécution `main` : graphe Test & audit → Build & push → Déploiement PRODUCTION |
| `E24-03-pipeline-preprod.png` | Détail d'une exécution `development` → Déploiement PRÉ-PRODUCTION |
| `E24-04-ghcr-packages.png` | GitHub → Packages : les 5 images `exam-*` |
| `E24-05-docker-ps.png` | Sur la VM : `sudo docker ps` (conteneurs prod, préprod et infra « healthy ») |

## E25 : journalisation et audit
| Fichier | Contenu à capturer |
|---|---|
| `E25-01-dozzle.png` | Dozzle : liste des conteneurs et logs JSON du backend |
| `E25-02-dozzle-audit.png` | Dozzle, conteneur `exam-prod-backend-1`, filtre `audit` : lignes `auth.login.success` / `order.created` |
| `E25-03-npm-audit-ci.png` | GitHub Actions → job « Test & audit » → étape « Audit de sécurité des dépendances » : 0 vulnérabilité |

## E26 : supervision et alertes
| Fichier | Contenu à capturer |
|---|---|
| `E26-01-kuma-dashboard.png` | Uptime Kuma : tableau de bord avec les 4 sondes vertes |
| `E26-02-kuma-sonde.png` | Détail d'une sonde « API santé » (graphe de temps de réponse, certificat) |
| `E26-03-kuma-notification.png` | Paramètres → Notifications : notification email configurée |
| `E26-04-email-alerte.png` | Email de test reçu de Uptime Kuma (bouton « Tester ») |

## E27 : bugs corrigés
| Fichier | Contenu à capturer |
|---|---|
| `E27-01-login-vide.png` | Page Connexion, envoi du formulaire vide → message d'erreur rouge dans la page |
| `E27-02-inscription-mdp-faible.png` | Inscription avec le mot de passe `abc` → message d'erreur |
| `E27-03-navbar-connecte.png` | Juste après connexion : « Bonjour, … » et « Déconnexion » visibles sans recharger la page |
| `E27-04-livraison-incomplete.png` | Livraison et Paiement, champs vides puis « Continuer » → liste des champs manquants |
| `E27-05-commande-confirmee.png` | Écran « Commande confirmée avec succès ! » avec le total |
| `E27-06-email-commande.png` | Email « Confirmation de votre commande » reçu |
| `E27-07-admin-stock-0.png` | Admin : stock mis à 0 accepté, puis produit affiché « Rupture de stock » sur l'accueil |
| `E27-08-tests-ci.png` | Logs GitHub Actions du job « Test & audit (backend) » : `# pass 25` |

## E28 : failles de sécurité
| Fichier | Contenu à capturer |
|---|---|
| `E28-01-inscription-script.png` | Inscription avec le nom `<script>alert('test')</script>` → refusée, aucune alerte JS |
| `E28-02-cookie-httponly.png` | Outils de développement (F12) → Application → Cookies : cookie `token` avec HttpOnly ✓, Secure ✓, SameSite Strict ; et onglet Local Storage sans token |
| `E28-03-acces-admin-refuse.png` | Connecté en client, ouverture de `/admin` → redirection vers l'accueil |
| `E28-04-rate-limit.png` | 11 tentatives de connexion erronées → « Trop de tentatives, veuillez réessayer dans 15 minutes. » |
| `E28-05-entetes-securite.png` | F12 → Réseau → requête vers l'API → en-têtes de réponse (Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, absence de X-Powered-By) |

## E29 : documentation
| Fichier | Contenu à capturer |
|---|---|
| `E29-01-jsdoc-accueil.png` | `docs/api/index.html` ouvert dans le navigateur |
| `E29-02-jsdoc-controller.png` | Page « Module: controllers/orderController » (createOrder documenté) |
| `E29-03-changelog.png` | `CHANGELOG.md` (aperçu Markdown dans VS Code) |
