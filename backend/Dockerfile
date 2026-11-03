# Image de production Node.js : dépendances de prod uniquement, utilisateur non-root
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .
RUN mkdir -p /app/logs && chown node:node /app/logs

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3   CMD wget -qO- http://127.0.0.1:5000/api/health > /dev/null || exit 1
CMD ["node", "server.js"]
