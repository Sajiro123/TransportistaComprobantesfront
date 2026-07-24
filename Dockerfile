# Stage 1: Build the Angular app
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and config files
COPY . .

# Build the project for production
RUN npm run build -- --configuration=production --base-href /subsidio_transportista/

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Remove default nginx website configuration
RUN rm -rf /usr/share/nginx/html/*

# Copy build files from stage 1 to Nginx serve directory
COPY --from=build /app/dist/frontend-comprobantes-trans/browser /usr/share/nginx/html/subsidio_transportista

# Copy Nginx custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]