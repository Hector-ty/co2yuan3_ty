# 使用 Node 20 Alpine 作为构建阶段
# 注意：需要配置 Docker 镜像加速器才能正常拉取镜像
FROM node:20-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 使用国内 npm 镜像，加速依赖安装
RUN npm config set registry https://registry.npmmirror.com \
    && npm install --legacy-peer-deps --no-audit --progress=false

# 复制项目源码
COPY . .

# 构建前端项目
RUN npm run build

# ---------------------
# 第二阶段：使用 Nginx 提供静态资源（使用国内镜像源）
# ---------------------
FROM nginx:stable-alpine

# 拷贝自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝打包产物到 nginx 的默认目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
