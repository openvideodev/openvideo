FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN pnpm install --ignore-scripts

COPY . .
RUN pnpm run build

# Copy SKILL.md files to dist for production
RUN cd src/skills/library && find . -name "*.md" -exec cp --parents {} ../../dist/src/skills/library \;

FROM node:22-bookworm-slim AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN pnpm install --prod --ignore-scripts && pnpm rebuild

COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/src/main.js"]
