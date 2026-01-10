# 使用 Python 3.11 稳定版 slim 镜像
# 注意：需要配置 Docker 镜像加速器才能正常拉取镜像
FROM python:3.11.9-slim-bullseye

# 设置工作目录
WORKDIR /code

# 使用国内 apt 源（清华）
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list \
 && sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list

# 安装系统依赖（带自动重试）
RUN set -eux; \
    for i in 1 2 3; do \
        apt-get update && \
        apt-get install -y --no-install-recommends \
            build-essential \
            python3-dev \
            curl && break || \
        (echo "⚠️ apt 安装失败，第 $i 次重试..." && sleep 3); \
    done; \
    rm -rf /var/lib/apt/lists/*

# 设置 pip 国内源（清华）+ 安装依赖
COPY ./requirements.txt /code/requirements.txt
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple \
 && pip config set install.trusted-host pypi.tuna.tsinghua.edu.cn \
 && pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --retries 10 --timeout 120 -r /code/requirements.txt \
 && pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 复制应用代码和数据
COPY ./app /code/app
COPY ./data /code/data

# 暴露端口
EXPOSE 8000

# 启动 uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
