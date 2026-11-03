// src/pages/ProductList.js
import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../services/api';
import { useCart } from '../context/CartContext';
import Alert from '../components/Alert';

/**
 * Catalogue : liste des produits avec prix et disponibilité.
 * Gère le chargement, les erreurs réseau et confirme chaque ajout au panier.
 * Un produit ne peut pas être ajouté au-delà du stock disponible.
 */
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { cart, dispatch } = useCart();

  useEffect(() => {
    fetchProducts()
      .then((response) => setProducts(response.data))
      .catch((err) => setError(err.userMessage))
      .finally(() => setLoading(false));
  }, []);

  // Le message de confirmation disparaît après 2,5 s
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const quantityInCart = (id) => cart.find((item) => item.id === id)?.quantity || 0;

  const addToCart = (product) => {
    if (quantityInCart(product._id) >= product.stock) {
      setNotice('');
      setError(`Stock insuffisant pour "${product.name}".`);
      return;
    }
    setError('');
    dispatch({
      type: 'ADD_TO_CART',
      payload: { id: product._id, name: product.name, price: product.price, stock: product.stock, quantity: 1 },
    });
    setNotice(`"${product.name}" a été ajouté au panier.`);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Liste des Produits</h2>
      <Alert type="error">{error}</Alert>
      <Alert type="success">{notice}</Alert>
      {loading && <p className="text-gray-500">Chargement des produits…</p>}
      {!loading && !error && products.length === 0 && <p>Aucun produit disponible.</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <li key={product._id} className="border p-4 rounded shadow">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-gray-500">{product.price} €</p>
            <p className={`text-sm ${product.stock > 0 ? 'text-gray-500' : 'text-red-600'}`}>
              {product.stock > 0 ? `En stock : ${product.stock}` : 'Rupture de stock'}
            </p>
            <button
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
              className="bg-green-500 text-white px-4 py-2 mt-2 rounded disabled:bg-gray-400"
            >
              Ajouter au panier
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductList;
