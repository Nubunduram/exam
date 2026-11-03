// src/pages/ShippingPayment.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShippingMethodSelection from '../components/ShippingMethodSelection';
import PaymentMethodSelection from '../components/handlePaymentChange';
import ShippingAddress from '../components/ShippingAddress';
import Alert from '../components/Alert';
import { useCart } from '../context/CartContext';
import { getCheckoutErrors } from '../utils/checkout';

/**
 * Étape « Livraison et Paiement » : adresse, transporteur et mode de paiement.
 * Le passage à la synthèse est bloqué tant que le formulaire est incomplet,
 * avec la liste précise des champs à corriger.
 */
const ShippingPayment = () => {
  const navigate = useNavigate();
  const cartState = useCart();
  const [errors, setErrors] = useState([]);

  const handleContinue = () => {
    const found = getCheckoutErrors(cartState);
    setErrors(found);
    if (found.length === 0) navigate('/order');
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Livraison et Paiement</h2>
      {errors.length > 0 && (
        <Alert type="error">
          <ul className="list-disc ml-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ShippingAddress />
        <div className="space-y-4">
          <ShippingMethodSelection />
          <PaymentMethodSelection />
        </div>
      </div>
      <hr className="my-4" />
      <div className="flex space-x-4">
        <button onClick={() => navigate('/cart')} className="bg-gray-400 text-white px-4 py-2 rounded">
          Retour au panier
        </button>
        <button onClick={handleContinue} className="bg-blue-500 text-white px-4 py-2 rounded">
          Continuer vers la synthèse
        </button>
      </div>
    </div>
  );
};

export default ShippingPayment;
