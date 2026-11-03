// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

/**
 * Barre de navigation : salutation, lien admin, panier (nombre d'articles) et connexion.
 * Elle lit l'utilisateur dans AuthContext : elle se met donc à jour immédiatement
 * après une connexion ou une déconnexion (auparavant, elle lisait localStorage
 * et restait figée jusqu'au rechargement de la page).
 */
const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">
        Mon Application
      </Link>

      <div className="flex items-center space-x-4">
        {isAuthenticated && <span className="font-semibold">Bonjour, {user.username}</span>}
        {isAdmin && <Link to="/admin">Administration</Link>}

        <Link to="/cart" className="relative pr-4">
          <span>Panier</span>
          {itemCount > 0 && (
            <span className="absolute -top-2 right-0 bg-red-500 text-white rounded-full text-xs px-2">{itemCount}</span>
          )}
        </Link>

        {!isAuthenticated ? (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        ) : (
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
