FROM node:20-alpine AS deps

# Set environment variables to reduce memory usage
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV npm_config_cache=/tmp/npm-cache
ENV CI=true

WORKDIR /app

# Install dependencies with optimizations
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund --omit=optional

# Build stage
FROM node:20-alpine AS builder

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV npm_config_cache=/tmp/npm-cache
ENV CI=true

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy project files
COPY . .

# Build the app with memory limits
RUN npm run build

# Production stage
FROM node:20-alpine

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV npm_config_cache=/tmp/npm-cache

WORKDIR /app

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]