# ============================================================
# Stage 1: Build Tauri app for Linux
# ============================================================
FROM rust:1.85-bookworm AS builder

# Install system dependencies for Tauri v2
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libssl-dev \
    libgtk-3-dev \
    libsoup-3.0-dev \
    javascriptcoregtk-4.1 \
    wget \
    file \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache Rust dependencies
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock* src-tauri/
COPY src-tauri/build.rs src-tauri/

# Cache Node dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy full source
COPY . .

# Build Tauri app
RUN cd src-tauri && cargo fetch
RUN npm run tauri build

# ============================================================
# Stage 2: Serve build artifacts via nginx
# ============================================================
FROM nginx:alpine

# Create download directory structure
RUN mkdir -p /usr/share/nginx/html/downloads

# Copy built artifacts
COPY --from=builder /app/src-tauri/target/release/bundle/deb/*.deb      /usr/share/nginx/html/downloads/
COPY --from=builder /app/src-tauri/target/release/bundle/appimage/*.AppImage /usr/share/nginx/html/downloads/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
