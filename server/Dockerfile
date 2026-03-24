# ============================================
# 第一阶段：构建阶段
# ============================================
FROM docker.m.daocloud.io/library/node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com \
    && npm install --production --legacy-peer-deps --no-audit --progress=false

COPY . .

# ============================================
# 第二阶段：运行阶段（Gotenberg 优先；Gotenberg 500 时用本机 LibreOffice 回退）
# ============================================
FROM docker.m.daocloud.io/library/node:20-bookworm-slim

WORKDIR /app

RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-core libreoffice-writer libreoffice-common fonts-dejavu-core fonts-liberation fonts-noto-core fonts-noto-cjk fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY . .

EXPOSE 8080

CMD ["npm", "start"]
