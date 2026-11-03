// src/context/AuthContext.js
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

/**
 * Fournit l'état d'authentification à toute l'application.
 * La session repose sur un cookie httpOnly posé par le serveur : au chargement,
 * on interroge /auth/me pour savoir si l'utilisateur est connecté.
 * Comme l'état est partagé via un contexte React, la Navbar et les routes protégées
 * se mettent à jour immédiatement après une connexion ou une déconnexion.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { username, role } ou null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchCurrentUser()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  /** Connecte l'utilisateur ; lève une erreur avec `userMessage` en cas d'échec. */
  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    setUser({ username: res.data.username, role: res.data.role });
    return res.data;
  }, []);

  /** Déconnecte l'utilisateur (suppression du cookie côté serveur). */
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = { user, loading, isAuthenticated: !!user, isAdmin: user?.role === 'admin', login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Hook d'accès au contexte d'authentification. */
export const useAuth = () => useContext(AuthContext);
