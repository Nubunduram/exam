// src/config.js
/**
 * URL de base de l'API backend.
 * Injectée au moment du build via la variable d'environnement REACT_APP_API_URL
 * (ex: https://api.preprod.exam-domain-name.duckdns.org/api). Valeur par défaut : développement local.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
