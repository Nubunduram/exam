// src/services/api.js
import http from './http';

/** Liste publique des produits. */
export const fetchProducts = () => http.get('/products');

/**
 * Crée une commande pour l'utilisateur connecté.
 * Seuls l'identifiant et la quantité des produits sont envoyés :
 * le prix est recalculé par le serveur.
 * @param {{items: Array<{productId: string, quantity: number}>, shippingAddress: object, paymentMethod: string, shippingMethod: string}} orderData
 */
export const createOrder = (orderData) => http.post('/orders', orderData);

/** Commandes de l'utilisateur connecté. */
export const fetchMyOrders = () => http.get('/orders/mine');

/** Authentification (le serveur dépose / supprime le cookie de session). */
export const login = (credentials) => http.post('/auth/login', credentials);
export const register = (data) => http.post('/auth/register', data);
export const logout = () => http.post('/auth/logout');
export const fetchCurrentUser = () => http.get('/auth/me');
