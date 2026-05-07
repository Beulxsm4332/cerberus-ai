# Cerberus AI - HuggingFace Spaces Docker Deployment
FROM node:20-slim AS base

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source code
COPY . .

# Build Next.js application
RUN bun run build

# Expose port for HuggingFace Spaces
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# Command to run
CMD ["bun", "run", "start"]
