# ============================================
# 第一阶段：构建阶段（使用国内 Docker 镜像源加速拉取）
# ============================================
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:20
FROM ${NODE_IMAGE} AS build

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 使用国内 npm 镜像，加速依赖安装
# 使用 BuildKit 缓存挂载加速 npm install
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmmirror.com \
    && npm install --legacy-peer-deps --no-audit --progress=false

# 复制项目源码
COPY . .

# 构建前端项目
RUN npm run build \
    && rm -rf node_modules

# ============================================
# 第二阶段：运行阶段（Nginx，使用国内镜像源）
# ============================================
FROM docker.m.daocloud.io/library/nginx:stable-alpine

# 拷贝自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝打包产物到 nginx 的默认目录
COPY --from=build /app/dist /usr/share/nginx/html

# 清理 nginx 不必要的文件
RUN rm -rf /usr/share/nginx/html/*.map 2>/dev/null || true

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
