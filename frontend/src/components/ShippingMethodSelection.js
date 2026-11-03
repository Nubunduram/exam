// src/components/ShippingMethodSelection.js
import React from 'react';
import { useCart } from '../context/CartContext';

/** Transporteurs disponibles (valeurs acceptées par l'API). */
export const SHIPPING_OPTIONS = [
  { value: 'colissimo', label: 'Colissimo' },
  { value: 'chronopost', label: 'Chronopost' },
];

/**
 * Choix du transporteur.
 * Une option vide « Choisir… » est affichée tant qu'aucun choix n'est fait : auparavant,
 * la liste affichait « Colissimo » alors que l'état valait null, et la commande était
 * refusée pour « méthode de livraison manquante » sans que l'utilisateur comprenne pourquoi.
 */
const ShippingMethodSelection = () => {
  const { shippingMethod, dispatch } = useCart();

  return (
    <div className="border p-4 rounded-md">
      <label htmlFor="shipping" className="block text-sm font-medium text-gray-700">
        Méthode de livraison *
      </label>
      <select
        id="shipping"
        value={shippingMethod || ''}
        onChange={(e) => dispatch({ type: 'SET_SHIPPING_METHOD', payload: e.target.value })}
        className="mt-1 block w-full rounded-md border border-gray-300 p-1"
      >
        <option value="">-- Choisir un transporteur --</option>
        {SHIPPING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ShippingMethodSelection;
