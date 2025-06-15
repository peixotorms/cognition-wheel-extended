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

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production

# Make the binary executable
RUN chmod +x dist/app.js

# Use the built app as entrypoint
ENTRYPOINT ["node", "dist/app.js"]