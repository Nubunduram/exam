// src/context/CartContext.js
import React, { createContext, useContext, useEffect, useReducer } from 'react';

const CartContext = createContext();
const STORAGE_KEY = 'cart';

/** État initial du panier et des choix de livraison / paiement. */
export const initialCartState = {
  cart: [],
  shippingMethod: null,
  paymentMethod: null,
  shippingAddress: { street: '', city: '', postalCode: '', country: '' },
};

/**
 * Reducer du panier. Toutes les mises à jour sont immuables
 * (aucun objet de l'état précédent n'est modifié).
 * @param {typeof initialCartState} state
 * @param {{type: string, payload?: any}} action
 */
export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const qty = action.payload.quantity || 1;
      const exists = state.cart.some((item) => item.id === action.payload.id);
      if (exists) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + qty } : item
          ),
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: qty }] };
    }

    case 'DECREMENT_QUANTITY':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(item.quantity - 1, 1) } // jamais inférieur à 1
            : item
        ),
      };

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((item) => item.id !== action.payload.id) };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'SET_SHIPPING_METHOD':
      return { ...state, shippingMethod: action.payload || null };

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload || null };

    case 'SET_SHIPPING_ADDRESS':
      return { ...state, shippingAddress: { ...state.shippingAddress, ...action.payload } };

    default:
      return state;
  }
};

/** Relit le panier sauvegardé (survit au rafraîchissement de la page). */
const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.cart) ? { ...initialCartState, ...saved } : initialCartState;
  } catch {
    return initialCartState;
  }
};

/** Fournit le panier global (Context API) à toute l'application. */
export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, undefined, loadState);

  // Persistance : le panier n'est plus perdu en cas de rechargement de la page
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartState));
  }, [cartState]);

  return <CartContext.Provider value={{ ...cartState, dispatch }}>{children}</CartContext.Provider>;
};

/** Hook d'accès au panier. */
export const useCart = () => useContext(CartContext);
