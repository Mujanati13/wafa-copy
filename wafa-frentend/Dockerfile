# Multi-stage build for WAFA Frontend
# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Vite replaces these variables while building.  The default keeps the browser
# on the same origin, where the frontend Nginx proxies API and upload requests.
ARG VITE_API_URL=/api/v1
ARG VITE_BASED_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASED_URL=${VITE_BASED_URL}

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
