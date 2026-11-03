# Captures d'écran

Une capture illustrative par compétence (E21 à E29), pour ce qui ne se vérifie pas dans le code.

> ⚠️ Ne jamais capturer un mot de passe, un fichier `.env`, un token ou une clé.

| Fichier | Compétence | Contenu à capturer |
|---|---|---|
| `E21-gcp-vm.png` | Hébergement | Console GCP → Compute Engine → Instances : VM `exam-server` (e2-micro, IP externe) |
| `E22-atlas-securite.png` | Production sécurisée | Atlas → Network Access : seule l'IP de la VM `35.188.148.90/32` est autorisée |
| `E23-certificat-https.png` | DNS / HTTPS | Site de production → clic sur le cadenas → certificat émis par Let's Encrypt |
| `E24-pipeline-github.png` | CI/CD | GitHub → Actions : détail d'une exécution verte (Test & audit → Build & push → Déploiement) |
| `E25-dozzle-logs.png` | Journalisation | Dozzle : logs JSON du backend de production |
| `E26-uptime-kuma.png` | Supervision | Uptime Kuma : tableau de bord avec les 4 sondes vertes |
| `E27-formulaire-vide.png` | Bugs | Page Connexion envoyée vide → message d'erreur affiché dans la page |
| `E28-xss-refuse.png` | Sécurité | Inscription avec le nom `<script>alert('test')</script>` → refusée, aucune alerte JS |
| `E28-cookie-httponly.png` | Sécurité | F12 → Application → Cookies : cookie `token` HttpOnly, Secure, SameSite Strict |
| `E29-jsdoc.png` | Documentation | `docs/api/index.html` ouvert dans le navigateur |
