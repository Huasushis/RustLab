# RustLab 运行器容器：在隔离的容器里编译运行代码，接口与官方 Playground 兼容。
#
#   docker build -t rustlab-runner runner
#   docker run --rm -p 127.0.0.1:7878:7878 --memory 1g --cpus 2 --pids-limit 256 \
#     -e ALLOW_ORIGINS=https://你的站点.pages.dev rustlab-runner
FROM rust:1-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && rustup component add rustfmt \
 && useradd --create-home runner

WORKDIR /app
COPY crates.mjs exec.mjs server.mjs ./

USER runner
ENV CARGO_HOME=/home/runner/.cargo
# 构建镜像时就把预装的第三方库下载编译好，容器启动后可以离线使用
RUN node server.mjs --prepare
ENV HOST=0.0.0.0 PORT=7878
EXPOSE 7878
CMD ["node", "server.mjs"]
