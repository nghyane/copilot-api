# syntax=docker/dockerfile:1.7    # <— bật BuildKit features

### -------- 1. Builder stage --------
FROM oven/bun:alpine AS builder
WORKDIR /app

# 1.1. Chỉ copy lockfile để giữ cache layer cài dependency
COPY bun.lock package.json ./

# 1.2. Dùng cache mount cho ~/.bun
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile

# 1.3. Copy phần source còn lại & build
COPY . .
RUN --mount=type=cache,target=/root/.bun \
    bun run build

### -------- 2. Runner stage --------
FROM oven/bun:alpine AS runner
WORKDIR /app

# 2.1. Cài deps runtime (production only) với cache
COPY bun.lock package.json ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile --production --ignore-scripts --no-cache

# 2.2. Copy artefacts
COPY --from=builder /app/dist ./dist
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 4141

ARG GH_TOKEN
ENV GH_TOKEN=$GH_TOKEN

ENTRYPOINT ["./entrypoint.sh"]
