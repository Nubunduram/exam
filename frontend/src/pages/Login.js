// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

/**
 * Page de connexion.
 * Contrôle des champs vides côté client, message d'erreur du serveur affiché dans la page,
 * bouton désactivé pendant l'envoi (pas de double soumission), puis redirection
 * vers la page demandée avant la connexion (ou l'accueil).
 */
const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!credentials.username.trim() || !credentials.password) {
      setError("Veuillez saisir votre nom d'utilisateur et votre mot de passe.");
      return;
    }
    setSubmitting(true);
    try {
      await login({ username: credentials.username.trim(), password: credentials.password });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Connexion</h2>
        <Alert type="error">{error}</Alert>
        <input
          type="text"
          name="username"
          placeholder="Nom d'utilisateur"
          autoComplete="username"
          value={credentials.username}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          autoComplete="current-password"
          value={credentials.password}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white p-2 w-full rounded disabled:opacity-50"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="text-sm text-center mt-4">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-blue-600 underline">
            Inscription
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
