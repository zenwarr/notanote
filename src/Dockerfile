FROM node:16

EXPOSE 8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global

COPY . /app
WORKDIR /app

RUN cd /app && \
    yarn install --frozen-lockfile --production=false && \
    yarn build-client && \
    yarn build && \
    rm -rf node_modules && \
    yarn install --frozen-lockfile --production=true

RUN cd /app && yarn --frozen-lockfile --production=true

ENTRYPOINT [ "node", "/app/index.js" ]
