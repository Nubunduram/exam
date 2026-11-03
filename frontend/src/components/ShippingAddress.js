// src/components/ShippingAddress.js
import React from 'react';
import { useCart } from '../context/CartContext';

/** Champs de l'adresse de livraison (libellé affiché, nom du champ, autocomplétion navigateur). */
const FIELDS = [
  { name: 'street', label: 'Rue', autoComplete: 'street-address' },
  { name: 'city', label: 'Ville', autoComplete: 'address-level2' },
  { name: 'postalCode', label: 'Code Postal', autoComplete: 'postal-code' },
  { name: 'country', label: 'Pays', autoComplete: 'country-name' },
];

/**
 * Formulaire d'adresse de livraison, synchronisé avec le panier global (CartContext).
 * Composant contrôlé : une seule source de vérité (le contexte), sans état local dupliqué.
 */
const ShippingAddress = () => {
  const { shippingAddress, dispatch } = useCart();

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { [name]: value } });
  };

  return (
    <div className="border p-4 rounded-md">
      <h3 className="text-lg font-semibold mb-2">Adresse de livraison</h3>
      <div className="space-y-2">
        {FIELDS.map(({ name, label, autoComplete }) => (
          <div key={name}>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
              {label} *
            </label>
            <input
              type="text"
              id={name}
              name={name}
              required
              maxLength={120}
              autoComplete={autoComplete}
              value={shippingAddress[name] || ''}
              onChange={handleAddressChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShippingAddress;
