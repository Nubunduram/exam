// src/components/handlePaymentChange.js
import React from 'react';
import { useCart } from '../context/CartContext';

/** Modes de paiement disponibles (valeurs acceptées par l'API). */
export const PAYMENT_OPTIONS = ['Carte bancaire', 'PayPal', 'Virement'];

/**
 * Choix du mode de paiement, avec une option vide tant qu'aucun choix n'est fait
 * (même correctif que pour le transporteur).
 */
const PaymentMethodSelection = () => {
  const { paymentMethod, dispatch } = useCart();

  return (
    <div className="border p-4 rounded-md">
      <label htmlFor="payment" className="block text-sm font-medium text-gray-700">
        Mode de paiement *
      </label>
      <select
        id="payment"
        value={paymentMethod || ''}
        onChange={(e) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: e.target.value })}
        className="mt-1 block w-full rounded-md border border-gray-300 p-1"
      >
        <option value="">-- Choisir un mode de paiement --</option>
        {PAYMENT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PaymentMethodSelection;
