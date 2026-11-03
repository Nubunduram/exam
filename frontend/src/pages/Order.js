// src/pages/Order.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder } from '../services/api';
import Alert from '../components/Alert';
import { getCheckoutErrors } from '../utils/checkout';

/**
 * Synthèse de la commande avant validation.
 * - Vérifie que toutes les informations sont présentes (sinon liste des erreurs).
 * - N'envoie au serveur que les identifiants et quantités : le prix est recalculé côté serveur.
 * - Affiche le message du serveur (succès, stock insuffisant, session expirée…).
 * - Bouton désactivé pendant l'envoi pour éviter les commandes en double.
 */
const Order = () => {
  const navigate = useNavigate();
  const cartState = useCart();
  const { cart, shippingAddress, paymentMethod, shippingMethod, dispatch } = cartState;
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSubmit = async () => {
    const found = getCheckoutErrors(cartState);
    setErrors(found);
    if (found.length > 0) return;

    setSubmitting(true);
    try {
      const response = await createOrder({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        shippingAddress,
        paymentMethod,
        shippingMethod,
      });
      dispatch({ type: 'CLEAR_CART' });
      setSuccess(`${response.data.message} Montant total : ${response.data.order.total.toFixed(2)} €.`);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login', { state: { from: '/order' } });
        return;
      }
      setErrors([error.userMessage]);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Synthèse de la commande</h2>
        <Alert type="success">{success}</Alert>
        <p>Un email de confirmation vous a été envoyé.</p>
        <Link to="/" className="text-blue-600 underline">
          Continuer mes achats
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Synthèse de la commande</h2>
      {errors.length > 0 && (
        <Alert type="error">
          <ul className="list-disc ml-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      {cart.length === 0 ? (
        <p className="text-gray-600">
          Votre panier est vide.{' '}
          <Link to="/" className="text-blue-600 underline">
            Voir les produits
          </Link>
        </p>
      ) : (
        <div>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Produit(s)</th>
                <th className="border border-gray-300 p-2">Quantité(s)</th>
                <th className="border border-gray-300 p-2">Prix Unitaire (€)</th>
                <th className="border border-gray-300 p-2">Prix Total (€)</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-center">{Number(item.price).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-center">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-bold text-lg mt-4">Total : {total.toFixed(2)} €</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Adresse de livraison</h3>
              <div className="bg-gray-50 p-4 rounded">
                <p>{shippingAddress.street || '—'}</p>
                <p>
                  {shippingAddress.postalCode} {shippingAddress.city}
                </p>
                <p>{shippingAddress.country}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Méthode de livraison</h3>
              <div className="bg-gray-50 p-4 rounded mb-4">{shippingMethod || 'Non spécifiée'}</div>
              <h3 className="text-lg font-semibold mb-2">Méthode de paiement</h3>
              <div className="bg-gray-50 p-4 rounded">{paymentMethod || 'Non spécifiée'}</div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={() => navigate('/shipping-payment')} className="bg-gray-400 text-white px-4 py-2 rounded">
              Modifier livraison / paiement
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Validation…' : 'Confirmer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Order;
