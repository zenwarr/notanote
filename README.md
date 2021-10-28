[![Publish](https://github.com/zenwarr/notanote/actions/workflows/publish.yml/badge.svg)](https://github.com/zenwarr/notanote/actions/workflows/publish.yml)

# Start dev env

Copy `.env-template` to `.env` and configure required variables.

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
