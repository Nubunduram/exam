// backend/createAdmin.js
/**
 * Crée (ou promeut) un compte administrateur.
 * Les identifiants sont lus dans les variables d'environnement pour ne jamais
 * apparaître dans le code ni dans les logs :
 *   ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Exemple sur le serveur :
 *   read -s -p "Mot de passe admin : " P; echo
 *   docker compose -p exam-preprod -f docker-compose.app.yml exec -T \
 *     -e ADMIN_USERNAME=admin -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD="$P" \
 *     backend node createAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGO_URI } = process.env;

(async () => {
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ADMIN_USERNAME, ADMIN_EMAIL et ADMIN_PASSWORD sont requis.');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 12) {
    console.error('Le mot de passe administrateur doit contenir au moins 12 caractères.');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    let user = await User.findOne({ $or: [{ username: ADMIN_USERNAME }, { email: ADMIN_EMAIL }] });
    if (user) {
      user.role = 'admin';
      user.password = ADMIN_PASSWORD; // re-hashé par le hook pre('save')
      await user.save();
      console.log(`Compte existant "${user.username}" promu administrateur.`);
    } else {
      user = await User.create({ username: ADMIN_USERNAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
      console.log(`Administrateur "${user.username}" créé.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Erreur :', err.message);
    process.exit(1);
  }
})();
