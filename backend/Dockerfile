FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm ci
RUN npm --prefix shared run build
RUN npm --prefix backend run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/shared ./shared
COPY --from=builder --chown=appuser:appgroup /app/backend/dist ./backend/dist
COPY --from=builder --chown=appuser:appgroup /app/backend/package.json ./backend/package.json
USER appuser
EXPOSE 5000
CMD ["node", "backend/dist/backend/src/server.js"]
