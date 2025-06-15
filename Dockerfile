FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and config
COPY src/ src/
COPY tsconfig.json ./

# Build the project
RUN pnpm run build

FROM node:22-alpine AS release

# Install pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy package files for runtime dependencies only
COPY package.json pnpm-lock.yaml ./

# Copy built application first
COPY --from=builder /app/dist ./dist

# Install only runtime dependencies, skip scripts to avoid prepare hook
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Set environment
ENV NODE_ENV=production

# Make the binary executable
RUN chmod +x dist/app.js

# Use the built app as entrypoint
ENTRYPOINT ["node", "dist/app.js"]