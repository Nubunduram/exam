// Tests unitaires du reducer du panier (Context API)
import { cartReducer } from './context/CartContext';

const initialState = {
  cart: [],
  shippingMethod: null,
  paymentMethod: null,
  shippingAddress: { street: '', city: '', postalCode: '', country: '' },
};

const product = { id: 'p1', name: 'Clavier', price: 120, quantity: 1 };

describe('cartReducer', () => {
  test('ajoute un produit au panier', () => {
    const state = cartReducer(initialState, { type: 'ADD_TO_CART', payload: product });
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(1);
  });

  test('incrémente la quantité si le produit est déjà présent', () => {
    const s1 = cartReducer(initialState, { type: 'ADD_TO_CART', payload: product });
    const s2 = cartReducer(s1, { type: 'ADD_TO_CART', payload: { id: 'p1', quantity: 1 } });
    expect(s2.cart).toHaveLength(1);
    expect(s2.cart[0].quantity).toBe(2);
  });

  test('la quantité ne descend jamais sous 1', () => {
    const s1 = cartReducer(initialState, { type: 'ADD_TO_CART', payload: product });
    const s2 = cartReducer(s1, { type: 'DECREMENT_QUANTITY', payload: { id: 'p1' } });
    expect(s2.cart[0].quantity).toBe(1);
  });

  test('retire un produit et vide le panier', () => {
    const s1 = cartReducer(initialState, { type: 'ADD_TO_CART', payload: product });
    expect(cartReducer(s1, { type: 'REMOVE_FROM_CART', payload: { id: 'p1' } }).cart).toHaveLength(0);
    expect(cartReducer(s1, { type: 'CLEAR_CART' }).cart).toHaveLength(0);
  });

  test('enregistre la méthode de livraison et de paiement', () => {
    let s = cartReducer(initialState, { type: 'SET_SHIPPING_METHOD', payload: 'colissimo' });
    s = cartReducer(s, { type: 'SET_PAYMENT_METHOD', payload: 'PayPal' });
    expect(s.shippingMethod).toBe('colissimo');
    expect(s.paymentMethod).toBe('PayPal');
  });
});
