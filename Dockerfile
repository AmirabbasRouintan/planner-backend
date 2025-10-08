FROM node:20-alpine

# Set environment variables to reduce memory usage
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV npm_config_cache=/tmp/npm-cache
ENV CI=true

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy project files
COPY . .

# Rebuild node modules to fix platform-specific issues
RUN npm rebuild

# Build the app with memory limits
RUN npm run build

# Expose port
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]