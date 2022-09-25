FROM node:18.5.0

EXPOSE 8080
ENV PORT=8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global && \
    deluser --remove-home node && \
    addgroup notanote && \
    adduser --uid 1000 --ingroup notanote --shell /bin/sh --disabled-password notanote

COPY . /app

WORKDIR /app

RUN --mount=type=cache,target=/yarn-cache cd /app && \
    yarn install --frozen-lockfile --production=false && \
    yarn build-client
