// backend/middlewares/validate.js
/**
 * Fabrique un middleware Express qui valide une partie de la requête avec un schéma Joi.
 * En cas d'erreur : réponse 400 avec un message lisible par l'utilisateur.
 * En cas de succès : la partie validée est remplacée par sa version nettoyée
 * (espaces supprimés, champs ignorés retirés, types convertis).
 *
 * @param {Joi.ObjectSchema} schema - Schéma Joi à appliquer.
 * @param {'body'|'params'|'query'} [source='body'] - Partie de la requête à valider.
 * @returns {express.RequestHandler}
 * @example router.post('/login', validate(schemas.login), login);
 */
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, {
      abortEarly: true,
      stripUnknown: false,
      convert: true,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    if (source === 'query') {
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }
    next();
  };

module.exports = validate;
