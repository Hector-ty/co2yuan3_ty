# ============================================
# 第一阶段：构建阶段（使用国内 Docker 镜像源加速拉取）
# ============================================
FROM docker.m.daocloud.io/library/python:3.11.9-slim-bullseye AS builder

# 设置工作目录
WORKDIR /code

# 使用国内 apt 源（清华）
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list \
 && sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list

# 安装构建依赖（带自动重试）
RUN set -eux; \
    for i in 1 2 3; do \
        apt-get update && \
        apt-get install -y --no-install-recommends \
            build-essential \
            python3-dev \
            gcc \
            g++ \
            && break || \
        (echo "⚠️ apt 安装失败，第 $i 次重试..." && sleep 3); \
    done

# 设置 pip 国内源（清华）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple \
 && pip config set install.trusted-host pypi.tuna.tsinghua.edu.cn \
 && pip install --no-cache-dir --upgrade pip

# 复制依赖文件并安装 Python 依赖
# 使用 BuildKit 缓存挂载加速 pip install
COPY ./requirements.txt /code/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 120 -r /code/requirements.txt \
 && pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu \
 && find /usr/local/lib/python3.11/site-packages -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true \
 && find /usr/local/lib/python3.11/site-packages -type f -name "*.pyc" -delete \
 && find /usr/local/lib/python3.11/site-packages -type f -name "*.pyo" -delete

# ============================================
# 第二阶段：运行阶段（最小化镜像，使用国内镜像源）
# ============================================
FROM docker.m.daocloud.io/library/python:3.11.9-slim-bullseye

# 设置工作目录
WORKDIR /code

# 使用国内 apt 源（清华）
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list \
 && sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list

# 仅安装运行时依赖（不包含构建工具）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        && rm -rf /var/lib/apt/lists/* \
        && apt-get clean

# 从构建阶段复制已安装的 Python 包
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制应用代码和数据
COPY ./app /code/app
COPY ./data /code/data

# 暴露端口
EXPOSE 8000

# 启动 uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
