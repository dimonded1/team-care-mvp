FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run test && npm run test:server && npm run build

FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node integrations ./integrations

USER node
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

CMD ["node", "server/index.mjs"]
