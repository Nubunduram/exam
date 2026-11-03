// src/pages/Cart.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Alert from '../components/Alert';

/**
 * Page panier : modification des quantités (bornées entre 1 et le stock connu),
 * retrait d'un article, vidage du panier et passage à l'étape livraison / paiement.
 */
const Cart = () => {
  const { cart, dispatch } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  /** +1 sur un article, sans dépasser le stock disponible. */
  const incrementQuantity = (item) => {
    if (item.stock !== undefined && item.quantity >= item.stock) {
      setError(`Stock maximum atteint pour "${item.name}" (${item.stock}).`);
      return;
    }
    setError('');
    dispatch({ type: 'ADD_TO_CART', payload: { id: item.id, quantity: 1 } });
  };

  /** -1 sur un article (jamais en dessous de 1). */
  const decrementQuantity = (id) => {
    setError('');
    dispatch({ type: 'DECREMENT_QUANTITY', payload: { id } });
  };

  const handleRemove = (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: { id } });

  const clearCart = () => {
    if (window.confirm('Vider entièrement le panier ?')) dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Mon Panier</h2>
      <Alert type="error">{error}</Alert>
      {cart.length === 0 ? (
        <p>
          Votre panier est vide.{' '}
          <Link to="/" className="text-blue-600 underline">
            Voir les produits
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Produit</th>
                <th className="border border-gray-300 p-2">Prix Unitaire (€)</th>
                <th className="border border-gray-300 p-2">Quantité</th>
                <th className="border border-gray-300 p-2">Prix Total (€)</th>
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2">{Number(item.price).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => decrementQuantity(item.id)}
                        disabled={item.quantity <= 1}
                        className="bg-gray-300 px-2 py-1 rounded-l disabled:opacity-50"
                        aria-label={`Diminuer la quantité de ${item.name}`}
                      >
                        -
                      </button>
                      <span className="text-center w-12 border border-gray-300 mx-1">{item.quantity}</span>
                      <button
                        onClick={() => incrementQuantity(item)}
                        className="bg-gray-300 px-2 py-1 rounded-r"
                        aria-label={`Augmenter la quantité de ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="border border-gray-300 p-2">{(item.price * item.quantity).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2">
                    <button onClick={() => handleRemove(item.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right font-bold text-lg mt-4">Total : {total.toFixed(2)} €</p>
          <div className="flex space-x-4 mt-4">
            <button onClick={clearCart} className="bg-red-500 text-white px-4 py-2 rounded">
              Vider le panier
            </button>
            <button onClick={() => navigate('/shipping-payment')} className="bg-blue-500 text-white px-4 py-2 rounded">
              Passer une commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
