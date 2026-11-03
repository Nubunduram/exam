// src/pages/Admin.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  getOrders,
  updateOrderStatus,
  validateOrder,
  deleteOrder,
  getProducts,
  updateProductStock,
} from '../services/adminApi';
import Alert from '../components/Alert';

/**
 * Page d'administration : gestion des commandes (validation, expédition, livraison,
 * annulation, suppression, détails) et des stocks produits.
 * Toutes les erreurs du serveur sont affichées dans la page ; l'affichage n'est mis à
 * jour qu'après confirmation du serveur.
 */
const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [busy, setBusy] = useState(null); // identifiant de l'élément en cours de mise à jour
  const [newStock, setNewStock] = useState({}); // saisie de stock par produit
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  /** Charge commandes et produits ; une erreur sur l'un n'empêche pas l'affichage de l'autre. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, productsRes] = await Promise.allSettled([getOrders(), getProducts()]);
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data);
    if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data);
    const failed = [ordersRes, productsRes].find((r) => r.status === 'rejected');
    setError(failed ? failed.reason.userMessage : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Nom lisible d'un produit à partir de son identifiant (détails de commande). */
  const productName = (id) => products.find((p) => p._id === id)?.name || id;

  /** Applique une action sur une commande puis remplace la commande dans la liste. */
  const runOrderAction = async (orderId, action) => {
    setBusy(orderId);
    setError('');
    setSuccess('');
    try {
      const res = await action();
      setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data.order : o)));
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm(`Supprimer définitivement la commande ${orderId} ?`)) return;
    setBusy(orderId);
    setError('');
    try {
      const res = await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      setSuccess(res.data.message);
      fetchData(); // le stock a pu être restitué
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(null);
    }
  };

  /** Met à jour le stock : entier >= 0 (la valeur 0 est désormais acceptée). */
  const handleStockUpdate = async (productId) => {
    const raw = newStock[productId];
    const stockValue = Number(raw);
    setError('');
    setSuccess('');
    if (raw === undefined || raw === '' || !Number.isInteger(stockValue) || stockValue < 0) {
      setError('Veuillez saisir un stock entier positif ou nul.');
      return;
    }
    setBusy(productId);
    try {
      const res = await updateProductStock(productId, stockValue);
      setProducts((prev) => prev.map((p) => (p._id === productId ? res.data.product : p)));
      setNewStock((prev) => ({ ...prev, [productId]: '' }));
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Page d'administration</h2>
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      {loading && <p className="text-gray-500">Chargement…</p>}

      {/* Gestion des Commandes */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold">Gestion des Commandes</h3>
        {!loading && orders.length === 0 && <p className="text-gray-500">Aucune commande.</p>}
        <ul>
          {orders.map((order) => (
            <li key={order._id} className="border p-4 mb-4 rounded shadow">
              <p>
                <strong>ID :</strong> {order._id}
              </p>
              <p>
                <strong>Date :</strong> {new Date(order.createdAt).toLocaleString('fr-FR')} — <strong>Total :</strong>{' '}
                {order.total} €
              </p>
              <p>
                <strong>Statut :</strong> {order.status}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {order.status === 'En attente' && (
                  <button
                    onClick={() => runOrderAction(order._id, () => validateOrder(order._id))}
                    disabled={busy === order._id}
                    className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Valider la commande
                  </button>
                )}
                {['En attente', 'En cours de traitement'].includes(order.status) && (
                  <button
                    onClick={() => runOrderAction(order._id, () => updateOrderStatus(order._id, 'Expédiée'))}
                    disabled={busy === order._id}
                    className="bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Changer état à « Expédiée »
                  </button>
                )}
                {order.status === 'Expédiée' && (
                  <button
                    onClick={() => runOrderAction(order._id, () => updateOrderStatus(order._id, 'Délivrée'))}
                    disabled={busy === order._id}
                    className="bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Marquer « Délivrée »
                  </button>
                )}
                {['En attente', 'En cours de traitement'].includes(order.status) && (
                  <button
                    onClick={() => runOrderAction(order._id, () => updateOrderStatus(order._id, 'Annulée'))}
                    disabled={busy === order._id}
                    className="bg-yellow-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Annuler
                  </button>
                )}
                <button onClick={() => setSelectedOrder(order)} className="bg-gray-500 text-white px-2 py-1 rounded">
                  Détails
                </button>
                <button
                  onClick={() => handleDelete(order._id)}
                  disabled={busy === order._id}
                  className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Gestion des Produits */}
      <div>
        <h2 className="text-xl font-bold">Gestion des Produits</h2>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Nom</th>
              <th className="border px-4 py-2">Prix</th>
              <th className="border px-4 py-2">Stock</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border">
                <td className="border px-4 py-2">{product.name}</td>
                <td className="border px-4 py-2">{product.price} €</td>
                <td className="border px-4 py-2">{product.stock}</td>
                <td className="border px-4 py-2 flex">
                  <input
                    type="number"
                    placeholder="Nouveau stock"
                    min="0"
                    step="1"
                    aria-label={`Nouveau stock pour ${product.name}`}
                    value={newStock[product._id] ?? ''}
                    className="border p-2 w-28"
                    onChange={(e) => setNewStock({ ...newStock, [product._id]: e.target.value })}
                  />
                  <button
                    onClick={() => handleStockUpdate(product._id)}
                    className="bg-green-500 text-white px-2 py-1 ml-2 rounded disabled:opacity-50"
                    disabled={busy === product._id}
                  >
                    {busy === product._id ? 'Mise à jour…' : 'Mettre à jour'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fenêtre modale : détails de la commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/2 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Détails de la Commande</h2>
            <p>
              <strong>ID :</strong> {selectedOrder._id}
            </p>
            <p>
              <strong>Statut :</strong> {selectedOrder.status}
            </p>
            <p>
              <strong>Total :</strong> {selectedOrder.total} €
            </p>
            <p>
              <strong>Livraison :</strong> {selectedOrder.shippingMethod} — <strong>Paiement :</strong>{' '}
              {selectedOrder.paymentMethod}
            </p>
            <p>
              <strong>Adresse :</strong> {selectedOrder.shippingAddress?.street},{' '}
              {selectedOrder.shippingAddress?.postalCode} {selectedOrder.shippingAddress?.city},{' '}
              {selectedOrder.shippingAddress?.country}
            </p>
            <h3 className="text-lg font-semibold mt-4">Produits :</h3>
            <ul className="mt-2">
              {selectedOrder.items.map((item) => (
                <li key={item._id || item.productId} className="border-b p-2">
                  <p>
                    <strong>{productName(item.productId)}</strong>
                  </p>
                  <p>
                    Quantité : {item.quantity} — Prix : {item.price} €
                  </p>
                </li>
              ))}
            </ul>
            <button onClick={() => setSelectedOrder(null)} className="bg-red-500 text-white px-4 py-2 mt-4 rounded">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
