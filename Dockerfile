FROM node:18-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=mcp:nodejs dist ./dist
COPY --chown=mcp:nodejs package.json ./

USER mcp

EXPOSE 3000

CMD ["node", "dist/index.js"]