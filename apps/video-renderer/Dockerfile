# Dockerfile for @openvideo/video-renderer
# Build from current directory (apps/video-renderer):
#   docker build -t openvideo-renderer .
#
# Run:
#   docker run --rm -v $(pwd)/project.json:/tmp/project.json openvideo-renderer /tmp/project.json /tmp/outputs/video.mp4
#
# Uses Playwright Chromium with WebCodecs support.

# ------------------------------------------------------------------------------
# Stage 1: Dependencies + Playwright Chromium
# ------------------------------------------------------------------------------
FROM node:22-bookworm AS deps

WORKDIR /app

# Copy package files (handles both npm and pnpm)
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN npm install

# Install Playwright Chromium (has WebCodecs support)
RUN npx playwright install chromium

# ------------------------------------------------------------------------------
# Stage 2: Production image with Playwright Chromium
# ------------------------------------------------------------------------------
FROM node:22-bookworm AS production

# Install Playwright's system dependencies + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy Playwright Chromium browser
COPY --from=deps /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy package files and static assets
COPY package.json renderer.html tsconfig.json ./

# Copy source and build
COPY src ./src
RUN npm run build

# Create output directory
RUN mkdir -p /tmp/outputs

# Environment variables
ENV NODE_ENV=production
# Chromium path from Playwright install
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

# Default command runs the CLI
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
