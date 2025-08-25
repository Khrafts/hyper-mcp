# Multi-stage Dockerfile that builds the TypeScript project inside the image

FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set workdir
WORKDIR /app

# Copy lockfile and package manifest first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (dev + prod) for building
RUN pnpm install --frozen-lockfile

# Copy the rest of the project files
COPY . .

# Build the project (outputs to dist/)
RUN pnpm run build

# Prune dev dependencies to keep runtime image slim
RUN pnpm prune --prod


FROM node:18-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S mcp -u 1001

WORKDIR /app

# Copy production node_modules and built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/package.json ./

# Set env and user
ENV NODE_ENV=production
USER mcp

EXPOSE 3000

CMD ["node", "dist/index.js"]
