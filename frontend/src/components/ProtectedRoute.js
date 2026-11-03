// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Réserve une page aux utilisateurs connectés ; sinon redirige vers /login
 * en mémorisant la page demandée pour y revenir après connexion.
 * (Protection d'interface uniquement : le serveur vérifie toujours la session.)
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="p-8 text-gray-500">Chargement…</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

export default ProtectedRoute;
