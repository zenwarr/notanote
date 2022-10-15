# How to start a developer environment

`Docker` and `docker-compose` is required for setting up a development environment. `yarn` is used to manage packages. BuildKit must be enabled.

Copy `.env-template` to `.env` and configure required variables.
You want to set `NODE_ENV` to `development` for this.

Install `mkcert` with your package manager and run `mkcert -install` to install root certificate if not done already. Then generate local certificates for the app, replacing `notes.localhost` with domain name configured in `.env` file:

```shell
mkcert -cert-file traefik/certs/local-cert.pem -key-file traefik/certs/local-key.pem "notes.localhost"
```

Next you can start up the app:

```
docker-compose up --build
```

Building server code is not required, as it uses `ts-node`. After updating server code, you just want to restart server process with `docker compose restart app`.
But updating client code requires bundle rebuilding, so you should run `yarn build-client-dev` (or `yarn build-client-dev --watch`) to rebuild client bundle (restarting server process is not required after build).
You can also run Storybook with `yarn storybook` command.
