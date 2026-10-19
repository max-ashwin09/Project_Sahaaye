FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm ci
RUN npm --prefix shared run build
RUN npm --prefix backend run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/shared/dist ./node_modules/@sahaaye/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@sahaaye/shared/
RUN npm ci --omit=dev
USER appuser
EXPOSE 5000
CMD ["node", "dist/server.js"]
