// backend/validators/schemas.js
/**
 * Schémas de validation Joi des entrées utilisateur.
 * Toute requête est validée AVANT d'atteindre les contrôleurs :
 * types stricts, longueurs bornées, listes de valeurs autorisées,
 * champs inconnus rejetés (protection contre l'injection d'opérateurs MongoDB
 * et l'affectation de masse, ex : { "role": "admin" }).
 * @module validators/schemas
 */
const Joi = require('joi');

/** Identifiant MongoDB (24 caractères hexadécimaux). */
const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Identifiant invalide.',
  'string.length': 'Identifiant invalide.',
});

/** Statuts de commande autorisés (identiques à l'enum du modèle Order). */
const ORDER_STATUSES = ['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée'];
const PAYMENT_METHODS = ['Carte bancaire', 'PayPal', 'Virement'];
const SHIPPING_METHODS = ['colissimo', 'chronopost'];

/** Inscription : nom alphanumérique, email valide, mot de passe robuste. */
const register = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required().messages({
    'string.alphanum': "Le nom d'utilisateur ne doit contenir que des lettres et des chiffres.",
    'string.min': "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    'string.max': "Le nom d'utilisateur doit contenir au plus 30 caractères.",
    'string.empty': "Le nom d'utilisateur est requis.",
    'any.required': "Le nom d'utilisateur est requis.",
  }),
  email: Joi.string().trim().lowercase().email().max(254).required().messages({
    'string.email': "L'adresse email est invalide.",
    'string.empty': "L'adresse email est requise.",
    'any.required': "L'adresse email est requise.",
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/, 'minuscule')
    .pattern(/[A-Z]/, 'majuscule')
    .pattern(/[0-9]/, 'chiffre')
    .required()
    .messages({
      'string.min': 'Le mot de passe doit contenir au moins 8 caractères.',
      'string.pattern.name': 'Le mot de passe doit contenir au moins une {#name}.',
      'string.empty': 'Le mot de passe est requis.',
      'any.required': 'Le mot de passe est requis.',
    }),
});

/** Connexion : chaînes simples uniquement (un objet { "$ne": null } est rejeté). */
const login = Joi.object({
  username: Joi.string().trim().max(30).required().messages({
    'string.base': "Nom d'utilisateur invalide.",
    'string.empty': "Le nom d'utilisateur est requis.",
    'any.required': "Le nom d'utilisateur est requis.",
  }),
  password: Joi.string().max(128).required().messages({
    'string.base': 'Mot de passe invalide.',
    'string.empty': 'Le mot de passe est requis.',
    'any.required': 'Le mot de passe est requis.',
  }),
});

const addressField = (label, max = 120) =>
  Joi.string()
    .trim()
    .min(1)
    .max(max)
    .required()
    .messages({
      'string.empty': `${label} est requis(e).`,
      'any.required': `${label} est requis(e).`,
      'string.max': `${label} est trop long(ue).`,
    });

/**
 * Création de commande. Le prix n'est PAS accepté du client :
 * il est recalculé côté serveur à partir de la base de données.
 */
const createOrder = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        quantity: Joi.number().integer().min(1).max(100).required().messages({
          'number.min': 'La quantité doit être au moins 1.',
          'number.max': 'La quantité maximale par produit est 100.',
          'number.integer': 'La quantité doit être un nombre entier.',
        }),
      }).unknown(true) // champs d'affichage (name, price) ignorés puis supprimés
    )
    .min(1)
    .max(50)
    .unique('productId')
    .required()
    .messages({
      'array.min': 'Le panier est vide.',
      'array.unique': 'Un produit ne peut apparaître qu’une seule fois dans la commande.',
      'any.required': 'Le panier est vide.',
    }),
  shippingAddress: Joi.object({
    street: addressField('La rue'),
    city: addressField('La ville', 80),
    postalCode: Joi.string()
      .trim()
      .pattern(/^[A-Za-z0-9 -]{3,10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Le code postal est invalide.',
        'string.empty': 'Le code postal est requis.',
        'any.required': 'Le code postal est requis.',
      }),
    country: addressField('Le pays', 60),
  })
    .required()
    .messages({ 'any.required': "L'adresse de livraison est requise." }),
  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required()
    .messages({
      'any.only': 'Mode de paiement invalide.',
      'any.required': 'Le mode de paiement est requis.',
    }),
  shippingMethod: Joi.string()
    .valid(...SHIPPING_METHODS)
    .required()
    .messages({
      'any.only': 'Méthode de livraison invalide.',
      'any.required': 'La méthode de livraison est requise.',
    }),
  total: Joi.any().strip(), // ignoré : recalculé côté serveur
});

/** Changement de statut d'une commande (admin). */
const updateOrderStatus = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .required()
    .messages({
      'any.only': 'Statut de commande invalide.',
      'any.required': 'Le statut est requis.',
    }),
});

/** Mise à jour du stock (admin) : entier positif ou nul. */
const updateStock = Joi.object({
  stock: Joi.number().integer().min(0).max(1000000).required().messages({
    'number.base': 'Le stock doit être un nombre.',
    'number.min': 'Le stock ne peut pas être négatif.',
    'number.integer': 'Le stock doit être un nombre entier.',
    'any.required': 'Le stock est requis.',
  }),
});

/** Paramètre de route :id / :orderId / :productId. */
const idParam = (name) => Joi.object({ [name]: objectId.required() });

module.exports = {
  register,
  login,
  createOrder,
  updateOrderStatus,
  updateStock,
  idParam,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
};
