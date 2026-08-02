# Deploy this copy alongside the existing VPS instance

This project no longer uses the old instance's fixed container names, Docker
volumes, or network. It runs as a fully isolated Compose project on a private
loopback port (default `127.0.0.1:8081`). The VPS's existing Nginx owns ports
80/443 and routes `copy.imrs-qcm.com` to this copy. The frontend proxies
`/api` and `/uploads` internally to its own backend.

The frontend also joins the existing `wafa_wafa-network`, allowing the
already-running `wafa-nginx` Docker container to reach this copy by container
name without exposing port 8081 publicly.

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
`FRONTEND_URL` and `CORS_ORIGIN` to `https://copy.imrs-qcm.com`, and set
`COOKIE_SECURE=true`. If the Mongo password has
characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode it in `MONGO_URL`.

Generate secrets with:

```bash
openssl rand -hex 32
```

## 3. Route the domains through the VPS Nginx

The VPS uses the existing `wafa-nginx` Docker container, not host Nginx. Add
the copy server blocks to `/root/wafa/nginx/nginx.conf`, proxying the frontend
hostname to `wafa-copy-frontend-1:80` on `wafa_wafa-network`. Obtain the
certificate through the existing Certbot webroot volume, then reload with
`docker exec wafa-nginx nginx -s reload`. Do not create another Nginx
container or bind this Compose project directly to ports 80/443.

## 4. Deploy and verify

```bash
chmod +x deploy-second-instance.sh
./deploy-second-instance.sh
curl -fsS http://127.0.0.1:8081/api/v1/test
docker compose --env-file .env logs --tail=100 backend frontend mongodb
```

Open `https://copy.imrs-qcm.com`. Port `8081` does not need a UFW rule because
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
