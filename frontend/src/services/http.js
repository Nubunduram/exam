// src/services/http.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Client HTTP unique de l'application.
 * - withCredentials : envoie automatiquement le cookie de session httpOnly
 *   (le token JWT n'est plus jamais accessible au JavaScript ni stocké en localStorage).
 * - Chaque erreur reçoit une propriété `userMessage` affichable à l'utilisateur.
 */
const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      error.userMessage = error.response.data?.message || `Erreur ${error.response.status}.`;
    } else {
      error.userMessage = 'Serveur injoignable. Vérifiez votre connexion et réessayez.';
    }
    return Promise.reject(error);
  }
);

export default http;
