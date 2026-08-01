# Deploy this copy alongside the existing VPS instance

This project no longer uses the old instance's fixed container names, Docker
volumes, network, ports 80/443, Nginx, or Certbot. It runs as a fully isolated
Compose project and exposes one new public port (default `8081`). The frontend
proxies `/api` and `/uploads` internally to its own backend.

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
`REPLACE_...` value. Set both `FRONTEND_URL` and `CORS_ORIGIN` to the exact
public URL, for example `http://203.0.113.10:8081`. If the Mongo password has
characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode it in `MONGO_URL`.

Generate secrets with:

```bash
openssl rand -hex 32
```

## 3. Deploy and verify

```bash
chmod +x deploy-second-instance.sh
./deploy-second-instance.sh
curl -fsS http://127.0.0.1:8081/api/v1/test
docker compose --env-file .env logs --tail=100 backend frontend mongodb
```

If UFW is enabled, allow only the chosen application port:

```bash
sudo ufw allow 8081/tcp
```

Open `http://YOUR_VPS_IP:8081`. The backend is deliberately not exposed on its
own host port; requests at `/api/v1/*` and `/uploads/*` remain within this
instance's frontend proxy.

## HTTPS/domain option

For a real domain, place this copy behind the VPS's existing shared Nginx or
reverse-proxy setup rather than starting a second server on 80/443. Route a new
host name to `127.0.0.1:8081`, set `FRONTEND_URL` and `CORS_ORIGIN` to its
`https://` URL, set `COOKIE_SECURE=true`, and rebuild with the deploy script.

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
