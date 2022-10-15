Nuclear notes is a minimalistic note-taking application for power users.
It is similar to Obsidian.md, but is open-source, self-hosted (in case you want to use a web version — a server is not
required) and has sync.

Nuclear notes is available as Web application, desktop (Windows and Linux) and mobile application (Android).
When installed as a desktop or mobile application, it can be used to manage a directory of local files (mostly markdown
files) and can work completely offline.
If installed on a server, it can be used to serve web application and synchronize files between multiple devices.

# Settings

Application behaviour and appearance is configured inside `.note/settings.json` file.
If you edit in inside Nuclear Notes it is going to be automatically suggest you available options.

## Configuring per-file settings

# Plugins

## Custom editors

You can create a custom editor for some files.

# Installing desktop application

You can install desktop application from [releases](https://github.com/zenwarr/nuclear-notes/releases) page.
After installing, you should choose a local directory where your files will be stored.
You can also choose to synchronize files with a server (see below), but this is completely optional.

# Installing mobile application

You can install Android application with apk file from [releases](
https://github.com/zenwarr/nuclear-notes/release) page.

# Installing web server

Running a web server is not required for the application to work, it is only required if you want to use a web version
or sync.
To install a web server, you need to have `docker` and `docker-compose` installed.

Next create a directory for the application (for example `~/notes`) and necessary directories inside it:

```shell
mkdir ~/notes
cd ~/notes
```

Next create `.env` file with the following contents:

```dotenv
# this is a public domain name that will be used to access the application
PUBLIC_DOMAIN=notes.localhost

# authentication password for `admin` user
AUTH_PASSWORD=password
```

Your files are going to be stored in `~/notes/data/workspaces` directory.
Files in this directory will be created by user with UID 1000, so make sure directory permissions allow it.

```shell
mkdir -p data/workspaces data/config
chown -R 1000:1000 data
```

Next create `docker-compose.yml` file with the following contents:

```yaml
version: "3.7"

services:
  app:
    image: ghcr.io/zenwarr/notanote:latest
    volumes:
      - ./data/workspaces:/workspaces
      - .env:/env/.env
      - ./data/config:/config
    restart: unless-stopped
    environment:
      - ENV_FILE=.env
      - CONFIG_DIR=/config
    init: true
    labels:
      - "traefik.http.routers.notes.rule=Host(\"${PUBLIC_DOMAIN}\")"
      - "traefik.http.services.notes.loadbalancer.server.port=8080"

  traefik:
    image: traefik:v2.6.2
    command: --providers.docker
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

This example uses Traefik as a reverse proxy, but you can use any other reverse proxy.
The application is not designed to run under plain http, so you will need to either generate SSL certificate or use a
reverse proxy service similar to Cloudflare.

```shell
docker-compose up --build -d
```

## Updating

To update application running in Docker, you need the following script (you can save it as `update.sh` in application
dir):

```shell
#!/usr/bin/env bash

set -ex

docker compose pull
docker compose up --force-recreate --build -d
docker system prune --all --volumes --force
```

# More

- [Developing the application](docs/developing.md)
