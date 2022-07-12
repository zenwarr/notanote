FROM node:18.5.0

EXPOSE 8080
ENV PORT=8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global && \
    deluser --remove-home node && \
    addgroup notanote && \
    adduser --uid 1000 --ingroup notanote --shell /bin/sh --disabled-password notanote

COPY container_data/known_hosts /home/notanote/.ssh/known_hosts

COPY . /app

WORKDIR /app

RUN --mount=type=cache,target=/yarn-cache cd /app && \
    yarn install --frozen-lockfile --production=false && \
    yarn build-client && \
    yarn build && \
    rm -rf node_modules && \
    yarn install --frozen-lockfile --production=true && \
    cd /app && \
    yarn --frozen-lockfile --production=true

USER notanote

ENTRYPOINT [ "node", "/app/index.js" ]
