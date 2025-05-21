# syntax=docker/dockerfile:1

# 1) Define your Node.js version up front (ASCII hyphens only)
ARG NODE_VERSION=22.15.1

# 2) Build stage: compile & prepare rhubarb
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app
ENV NODE_ENV=production

# Install system deps for node modules + rhubarb download/unzip
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      node-gyp \
      pkg-config \
      python3 \
      ca-certificates \
      curl \
      unzip

# Install node modules
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Download & unpack rhubarb
RUN mkdir -p /app/bin && \
    curl -L https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.10.0/rhubarb-linux.zip \
      -o rhubarb.zip && \
    unzip rhubarb.zip -d /app/bin && \
    chmod +x /app/bin/rhubarb && \
    rm rhubarb.zip

# 3) Final runtime image
FROM node:${NODE_VERSION}-slim

WORKDIR /app
ENV NODE_ENV=production

# Install ffmpeg for audio conversion
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built app + rhubarb binary from builder
COPY --from=builder /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
