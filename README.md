[![Publish](https://github.com/zenwarr/notanote/actions/workflows/publish.yml/badge.svg)](https://github.com/zenwarr/notanote/actions/workflows/publish.yml)

# Start dev env

Copy `.env-template` to `.env` and configure required variables.

Install `mkcert` with your package manager and run `mkcert -install` to install root certificate.

Generate local certificates:

```shell
mkcert -cert-file traefik/certs/local-cert.pem -key-file traefik/certs/local-key.pem "notes.localhost"
```

You need to have BuildKit enabled to build these images.

```
docker-compose up --build
```

# Start in production with docker-compose

Copy `.env-template` to `.env` and configure required variables.

Run using `deploy/docker-compose.yml` config.

```
docker-compose up --build -d
```
