FROM node:16.8.0

ARG CONTAINER_USER_ID

EXPOSE 8080
ENV PORT=8080

RUN deluser --remove-home node && \
    addgroup notanote && \
    adduser --uid $CONTAINER_USER_ID --ingroup notanote --shell /bin/sh --disabled-password notanote

USER notanote

WORKDIR /app

ENTRYPOINT [ "yarn", "ts-node", "/app/index.ts" ]
