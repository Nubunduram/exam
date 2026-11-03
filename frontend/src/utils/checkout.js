// src/utils/checkout.js

const ADDRESS_LABELS = { street: 'rue', city: 'ville', postalCode: 'code postal', country: 'pays' };

/**
 * Liste les informations manquantes ou invalides avant de pouvoir commander.
 * Utilisée par l'étape « Livraison et Paiement » et par la synthèse de commande,
 * pour donner à l'utilisateur un message précis plutôt qu'une erreur serveur.
 * @param {{cart: Array, shippingAddress: object, shippingMethod: ?string, paymentMethod: ?string}} state
 * @returns {string[]} messages d'erreur (tableau vide si tout est valide)
 */
export const getCheckoutErrors = ({ cart, shippingAddress, shippingMethod, paymentMethod }) => {
  const errors = [];
  if (!cart || cart.length === 0) errors.push('Votre panier est vide.');
  Object.entries(ADDRESS_LABELS).forEach(([field, label]) => {
    if (!shippingAddress?.[field]?.trim()) errors.push(`Adresse : le champ « ${label} » est obligatoire.`);
  });
  if (shippingAddress?.postalCode?.trim() && !/^[A-Za-z0-9 -]{3,10}$/.test(shippingAddress.postalCode.trim())) {
    errors.push('Adresse : le code postal est invalide.');
  }
  if (!shippingMethod) errors.push('Veuillez choisir une méthode de livraison.');
  if (!paymentMethod) errors.push('Veuillez choisir un mode de paiement.');
  return errors;
};
