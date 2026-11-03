// src/components/Alert.js
import React from 'react';

const STYLES = {
  error: 'bg-red-100 text-red-800 border-red-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
};

/**
 * Message de retour utilisateur (erreur, succès, information) affiché dans la page,
 * à la place des alert() bloquants. Le texte est rendu par React, donc échappé (pas de XSS).
 * @param {{type?: 'error'|'success'|'info', children: React.ReactNode}} props
 */
const Alert = ({ type = 'info', children }) => {
  if (!children) return null;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`border rounded p-3 mb-4 ${STYLES[type]}`}>
      {children}
    </div>
  );
};

export default Alert;
