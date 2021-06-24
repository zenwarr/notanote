FROM node:16-alpine

EXPOSE 8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global

WORKDIR /app

ENTRYPOINT [ "yarn", "ts-node", "/app/index.ts" ]
