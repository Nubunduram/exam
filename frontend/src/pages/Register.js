// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import Alert from '../components/Alert';

/**
 * Valide le formulaire d'inscription côté client (mêmes règles que le serveur,
 * qui reste la référence). Renvoie un message d'erreur, ou une chaîne vide si tout est valide.
 * @param {{username: string, email: string, password: string}} data
 * @returns {string}
 */
export const validateRegister = ({ username, email, password }) => {
  if (!username.trim() || !email.trim() || !password) return 'Tous les champs sont obligatoires.';
  if (!/^[a-zA-Z0-9]{3,30}$/.test(username.trim())) {
    return "Le nom d'utilisateur doit contenir 3 à 30 lettres ou chiffres.";
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "L'adresse email est invalide.";
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins 8 caractères dont une minuscule, une majuscule et un chiffre.';
  }
  return '';
};

/** Page d'inscription avec validation et retour utilisateur dans la page. */
const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateRegister(formData);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Inscription</h2>
        <Alert type="error">{error}</Alert>
        <Alert type="success">{success}</Alert>
        <input
          type="text"
          name="username"
          placeholder="Nom d'utilisateur"
          autoComplete="username"
          value={formData.username}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="email"
          name="email"
          placeholder="Adresse email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-1"
        />
        <p className="text-xs text-gray-500 mb-4">8 caractères min., avec majuscule, minuscule et chiffre.</p>
        <button
          type="submit"
          disabled={submitting || !!success}
          className="bg-blue-500 text-white p-2 w-full rounded disabled:opacity-50"
        >
          {submitting ? 'Création…' : "S'inscrire"}
        </button>
      </form>
    </div>
  );
};

export default Register;
