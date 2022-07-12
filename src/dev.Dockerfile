FROM node:18.5.0

ARG CONTAINER_USER_ID

EXPOSE 8080
ENV PORT=8080

RUN deluser --remove-home node && \
    addgroup notanote && \
    adduser --uid $CONTAINER_USER_ID --ingroup notanote --shell /bin/sh --disabled-password notanote

COPY container_data/known_hosts /home/notanote/.ssh/known_hosts

USER notanote

WORKDIR /app

ENTRYPOINT [ "yarn", "ts-node", "/app/index.ts" ]
