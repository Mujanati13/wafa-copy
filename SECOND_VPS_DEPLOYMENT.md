# Deploy this copy alongside the existing VPS instance

This project no longer uses the old instance's fixed container names, Docker
volumes, or network. It runs as a fully isolated Compose project on a private
loopback port (default `127.0.0.1:8081`). The setup script configures either
the VPS's shared Nginx or host Nginx to own ports 80/443 and route
`atlas-qcm.online` to this copy. The frontend proxies
`/api` and `/uploads` internally to its own backend.

When a shared `wafa-nginx` Docker container exists, the frontend also joins
the `wafa_wafa-network` so that proxy can reach it by container name. On a
Copy-only VPS, host Nginx instead reaches the private loopback port directly.

## 1. Copy the project to a new directory on the VPS

```bash
sudo mkdir -p /opt/wafa-copy
sudo chown "$USER":"$USER" /opt/wafa-copy
# Upload/clone this copy into /opt/wafa-copy, then:
cd /opt/wafa-copy
```

Do not run the legacy `deploy-vps.sh`; it claims ports 80 and 443 and can
interfere with the already deployed project.

## 2. Create unique secrets and MongoDB credentials

```bash
cp .env.instance.example .env
nano .env
chmod 600 .env
```

Set `APP_PORT` to an unused port (for example `8081`) and replace every
`REPLACE_...` value. For this copy, keep `APP_HOST_BIND=127.0.0.1`, set both
`FRONTEND_URL` and `CORS_ORIGIN` to `https://atlas-qcm.online`, and set
`COOKIE_SECURE=true` and `COOKIE_DOMAIN=.atlas-qcm.online`. If the Mongo password has
characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode it in `MONGO_URL`.

Generate secrets with:

```bash
openssl rand -hex 32
```

## 3. Route the domains through the VPS Nginx

Create these two DNS `A` records in Hostinger, both pointing to the VPS public
IPv4 address:

| Host | Domain |
| --- | --- |
| `@` | `atlas-qcm.online` |
| `backend` | `backend.atlas-qcm.online` |

When the VPS already has the main WAFA `wafa-nginx` container, the script adds
the Copy routes to that shared proxy. On a Copy-only VPS, it instead installs
and configures host Nginx to route the two domains to Copy's private
`127.0.0.1:8081` frontend port. Do not add an Nginx service to the Copy Compose
file or expose the backend directly. The script requests one Let's Encrypt
certificate covering both domains, validates the config, and creates a deploy
hook to reload Nginx after future renewals.

```bash
cd /opt/wafa-copy
chmod +x setup-copy-domains.sh
sudo ./setup-copy-domains.sh your-email@example.com
```

The script verifies that both hostnames resolve to the current VPS before it
requests a certificate, and creates a timestamped backup of the current Nginx
configuration before every change. It also backs up `.env`, updates the
frontend/CORS/cookie/OAuth URLs, and recreates only the Copy backend and
frontend containers so generated links and authentication use the new domain.

## 4. Deploy and verify

```bash
chmod +x deploy-second-instance.sh
./deploy-second-instance.sh
curl -fsS http://127.0.0.1:8081/api/v1/test
docker compose --env-file .env logs --tail=100 backend frontend mongodb
```

Open `https://atlas-qcm.online`. Port `8081` does not need a UFW rule because
it is bound to loopback only. The backend is deliberately not exposed on its
own host port; requests at `/api/v1/*` and `/uploads/*` remain within this
instance's frontend proxy.

## Manage only this copy

Run these from `/opt/wafa-copy`:

```bash
docker compose --env-file .env ps
docker compose --env-file .env logs -f
docker compose --env-file .env up -d --build
docker compose --env-file .env down
```

Because the Compose project name is `wafa-copy`, these commands affect only
this copy. Its MongoDB data is stored in the separate `wafa-copy_mongodb_data`
volume.
