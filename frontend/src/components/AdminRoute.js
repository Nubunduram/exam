// src/components/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Réserve une page aux administrateurs ; sinon redirige vers l'accueil.
 * (Protection d'interface uniquement : chaque appel admin est contrôlé par le serveur.)
 */
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p className="p-8 text-gray-500">Chargement…</p>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default AdminRoute;
