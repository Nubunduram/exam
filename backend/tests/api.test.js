// backend/tests/api.test.js
// Tests de non-régression des correctifs de sécurité et de robustesse (sans base de données :
// chaque requête testée est rejetée avant d'atteindre MongoDB).
// Lancement : npm test
process.env.JWT_SECRET = 'test-secret-de-plus-de-trente-deux-caracteres-0123456789';
process.env.CORS_ORIGIN = 'https://preprod.exam-domain-name.duckdns.org';
process.env.LOG_LEVEL = 'error';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const userToken = jwt.sign({ userId: '64b000000000000000000001', role: 'user' }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ userId: '64b000000000000000000002', role: 'admin' }, process.env.JWT_SECRET);
const validId = '64b0000000000000000000aa';

test('GET /api/health renvoie 503 quand la base est indisponible', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.body.database, 'down');
});

test('En-têtes de sécurité helmet présents et X-Powered-By masqué', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['x-content-type-options']);
  assert.strictEqual(res.headers['x-powered-by'], undefined);
});

test('CORS : origine non autorisée refusée', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
  assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
});

test('CORS : origine autorisée acceptée avec credentials', async () => {
  const res = await request(app).get('/api/health').set('Origin', process.env.CORS_ORIGIN);
  assert.strictEqual(res.headers['access-control-allow-origin'], process.env.CORS_ORIGIN);
  assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
});

test('Login : injection NoSQL { "$ne": null } rejetée (400)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: { $ne: null }, password: { $ne: null } });
  assert.strictEqual(res.status, 400);
});

test('Login : formulaire vide rejeté avec un message clair', async () => {
  const res = await request(app).post('/api/auth/login').send({ username: '', password: '' });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /requis/);
});

test('Inscription : mot de passe faible rejeté', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', email: 'bob@test.fr', password: 'abc' });
  assert.strictEqual(res.status, 400);
});

test('Inscription : injection HTML/JS dans le nom refusée', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: "<script>alert('test')</script>", email: 'x@test.fr', password: 'Password1' });
  assert.strictEqual(res.status, 400);
});

test("Inscription : élévation de privilège via { role: 'admin' } refusée", async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'hacker', email: 'h@test.fr', password: 'Password1', role: 'admin' });
  assert.strictEqual(res.status, 400);
});

test('JSON malformé : 400 propre, pas de crash ni de stack', async () => {
  const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"username":');
  assert.strictEqual(res.status, 400);
  assert.ok(!JSON.stringify(res.body).includes('at '));
});

test('Commande sans authentification : 401', async () => {
  const res = await request(app).post('/api/orders').send({});
  assert.strictEqual(res.status, 401);
});

test('Commande avec token falsifié : 401', async () => {
  const forged = jwt.sign({ userId: validId, role: 'admin' }, 'mauvais-secret');
  const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${forged}`);
  assert.strictEqual(res.status, 401);
});

test('Commande : panier vide rejeté', async () => {
  const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${userToken}`).send({ items: [] });
  assert.strictEqual(res.status, 400);
});

test('Commande : quantité négative rejetée', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      items: [{ productId: validId, quantity: -5 }],
      shippingAddress: { street: '1 rue', city: 'Paris', postalCode: '75001', country: 'France' },
      paymentMethod: 'PayPal',
      shippingMethod: 'colissimo',
    });
  assert.strictEqual(res.status, 400);
});

test('Commande : méthode de paiement hors liste rejetée', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      items: [{ productId: validId, quantity: 1 }],
      shippingAddress: { street: '1 rue', city: 'Paris', postalCode: '75001', country: 'France' },
      paymentMethod: 'Bitcoin',
      shippingMethod: 'colissimo',
    });
  assert.strictEqual(res.status, 400);
});

test('Commande : adresse incomplète rejetée', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      items: [{ productId: validId, quantity: 1 }],
      shippingAddress: { street: '', city: 'Paris', postalCode: '75001', country: 'France' },
      paymentMethod: 'PayPal',
      shippingMethod: 'colissimo',
    });
  assert.strictEqual(res.status, 400);
});

test('Contrôle d’accès : un utilisateur ne peut pas lister toutes les commandes (403)', async () => {
  const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
  assert.strictEqual(res.status, 403);
});

test('Contrôle d’accès : un utilisateur ne peut pas supprimer une commande (403)', async () => {
  const res = await request(app).delete(`/api/orders/${validId}`).set('Authorization', `Bearer ${userToken}`);
  assert.strictEqual(res.status, 403);
});

test('Contrôle d’accès : un utilisateur ne peut pas modifier un statut (403)', async () => {
  const res = await request(app)
    .put(`/api/orders/${validId}/status`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ status: 'Expédiée' });
  assert.strictEqual(res.status, 403);
});

test('Contrôle d’accès : un utilisateur ne peut pas modifier le stock (403)', async () => {
  const res = await request(app)
    .put(`/api/products/${validId}/stock`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ stock: 999 });
  assert.strictEqual(res.status, 403);
});

test('Admin : statut inconnu rejeté', async () => {
  const res = await request(app)
    .put(`/api/orders/${validId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'Volée' });
  assert.strictEqual(res.status, 400);
});

test('Admin : stock négatif ou non entier rejeté', async () => {
  for (const stock of [-1, 2.5, 'abc']) {
    const res = await request(app)
      .put(`/api/products/${validId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock });
    assert.strictEqual(res.status, 400, `stock=${stock}`);
  }
});

test('Admin : identifiant de commande invalide rejeté', async () => {
  const res = await request(app).delete('/api/orders/not-an-id').set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(res.status, 400);
});

test('Route inconnue : 404 JSON', async () => {
  const res = await request(app).get('/api/nope');
  assert.strictEqual(res.status, 404);
});

test('Déconnexion : le cookie de session est supprimé', async () => {
  const res = await request(app).post('/api/auth/logout');
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /token=;/);
});
