# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production --base-href /subsidios/

# ── Stage 2: Serve ─────────────────────────────────────────────
FROM nginx:1.27-alpine
# Eliminar la configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf
# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/
# Copiar la app compilada
COPY --from=build /app/dist/frontend-comprobantes-trans/browser /usr/share/nginx/html
EXPOSE 8084
CMD ["nginx", "-g", "daemon off;"]
