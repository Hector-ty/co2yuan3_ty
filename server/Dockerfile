# 使用 Node.js 20 的轻量版镜像
# 注意：需要配置 Docker 镜像加速器才能正常拉取镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 配置 Alpine 镜像源（使用阿里云镜像加速）
RUN sed -i 's|http://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories || \
    echo "https://mirrors.aliyun.com/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/main" > /etc/apk/repositories && \
    echo "https://mirrors.aliyun.com/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/community" >> /etc/apk/repositories

# 先复制依赖文件（利用 Docker 缓存）
COPY package*.json ./

# 设置 npm 镜像为阿里源，加速依赖下载
RUN npm config set registry https://registry.npmmirror.com

# 安装项目依赖（跳过 peer 冲突，禁用审计日志）
RUN npm install --production --legacy-peer-deps --no-audit --progress=false

# 复制项目全部代码
COPY . .

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["npm", "start"]


