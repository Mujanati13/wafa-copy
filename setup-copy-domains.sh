#!/usr/bin/env bash
# Configure the two public WAFA Copy domains. It reuses a running shared
# `wafa-nginx` container when present, otherwise it configures host Nginx.
#
# Usage:
#   sudo ./setup-copy-domains.sh admin@example.com
#
# Prerequisites:
#   * DNS A records for YourQcm.online and backend.YourQcm.online point
#     to this VPS.
#   * The WAFA Copy stack has been deployed (`./deploy-second-instance.sh`).
#   * Port 80/443 is unused if this VPS does not already have `wafa-nginx`.

set -euo pipefail

FRONTEND_DOMAIN="YourQcm.online"
BACKEND_DOMAIN="backend.YourQcm.online"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env}"
NGINX_CONTAINER="${NGINX_CONTAINER:-wafa-nginx}"
COPY_FRONTEND_CONTAINER="${COPY_FRONTEND_CONTAINER:-wafa-copy-frontend-1}"
COPY_FRONTEND_PORT="${COPY_FRONTEND_PORT:-}"
PROXY_MODE="${PROXY_MODE:-auto}"
LETSENCRYPT_EMAIL="${1:-${LETSENCRYPT_EMAIL:-}}"

fail() {
    echo "Error: $*" >&2
    exit 1
}

info() {
    echo "==> $*"
}

require_root() {
    [ "${EUID}" -eq 0 ] || fail "Run this script with sudo or as root."
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

validate_email() {
    [[ "$LETSENCRYPT_EMAIL" == *@*.* ]] || fail "Pass a valid Let's Encrypt email address as the first argument."
}

validate_dns() {
    local server_ip domain resolved_ip
    server_ip="$(curl -4fsS --max-time 10 https://api.ipify.org || true)"
    [ -n "$server_ip" ] || fail "Could not determine this VPS public IPv4 address."

    for domain in "$FRONTEND_DOMAIN" "$BACKEND_DOMAIN"; do
        resolved_ip="$(getent ahostsv4 "$domain" | awk 'NR == 1 { print $1 }')"
        [ -n "$resolved_ip" ] || fail "$domain has no IPv4 DNS record yet. Add its A record, wait for DNS propagation, then run this script again."
        [ "$resolved_ip" = "$server_ip" ] || fail "$domain resolves to $resolved_ip, but this VPS is $server_ip. Update the DNS A record before requesting a certificate."
    done
}

set_env_value() {
    local key="$1" value="$2" temp_file
    temp_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
    awk -v key="$key" -v value="$value" '
        BEGIN { found = 0 }
        $0 ~ "^" key "=" {
            print key "=" value
            found = 1
            next
        }
        { print }
        END {
            if (!found) print key "=" value
        }
    ' "$ENV_FILE" > "$temp_file"
    chmod --reference="$ENV_FILE" "$temp_file"
    mv "$temp_file" "$ENV_FILE"
}

update_runtime_domains() {
    [ -f "$ENV_FILE" ] || fail "Environment file not found: $ENV_FILE. Copy .env.instance.example to .env and fill in its secrets first."

    if grep -Fqx "FRONTEND_URL=https://${FRONTEND_DOMAIN}" "$ENV_FILE" \
        && grep -Fqx "CORS_ORIGIN=https://${FRONTEND_DOMAIN}" "$ENV_FILE" \
        && grep -Fqx "COOKIE_DOMAIN=.YourQcm.online" "$ENV_FILE" \
        && grep -Fqx "GOOGLE_CALLBACK_URL=https://${BACKEND_DOMAIN}/api/v1/auth/google/callback" "$ENV_FILE"; then
        info "Runtime domain settings are already current"
        return
    fi

    local env_backup="${ENV_FILE}.before-domain-change-$(date +%Y%m%d%H%M%S).bak"
    cp -a "$ENV_FILE" "$env_backup"
    set_env_value FRONTEND_URL "https://${FRONTEND_DOMAIN}"
    set_env_value CORS_ORIGIN "https://${FRONTEND_DOMAIN}"
    set_env_value COOKIE_DOMAIN ".YourQcm.online"
    set_env_value GOOGLE_CALLBACK_URL "https://${BACKEND_DOMAIN}/api/v1/auth/google/callback"
    info "Updated frontend, CORS, cookie, and OAuth domain settings (backup: $env_backup)"

    docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.yml" \
        up -d --build --force-recreate backend frontend
}

find_copy_frontend() {
    if ! docker container inspect "$COPY_FRONTEND_CONTAINER" >/dev/null 2>&1; then
        COPY_FRONTEND_CONTAINER="$(docker ps --format '{{.Names}}' | awk '/^wafa-copy-frontend-[0-9]+$/ { print; exit }')"
        [ -n "$COPY_FRONTEND_CONTAINER" ] || fail "The WAFA Copy frontend container is not running. Run ./deploy-second-instance.sh first."
    fi

    if [ -z "$COPY_FRONTEND_PORT" ]; then
        COPY_FRONTEND_PORT="$(docker port "$COPY_FRONTEND_CONTAINER" 80 | awk -F: 'NR == 1 { print $NF }')"
    fi
    [[ "$COPY_FRONTEND_PORT" =~ ^[0-9]+$ ]] || fail "Could not determine the host port published by $COPY_FRONTEND_CONTAINER. Set COPY_FRONTEND_PORT explicitly."
}

configure_docker_nginx() {
    NGINX_CONFIG="$(docker inspect "$NGINX_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/nginx.conf"}}{{.Source}}{{end}}{{end}}')"
    CERTBOT_WEBROOT="$(docker inspect "$NGINX_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/var/www/certbot"}}{{.Source}}{{end}}{{end}}')"

    [ -n "$NGINX_CONFIG" ] || fail "Could not locate the host Nginx configuration mounted by $NGINX_CONTAINER."
    [ -f "$NGINX_CONFIG" ] || fail "Nginx configuration file does not exist: $NGINX_CONFIG"
    [ -n "$CERTBOT_WEBROOT" ] || fail "Could not locate the Certbot webroot mounted by $NGINX_CONTAINER."
    mkdir -p "$CERTBOT_WEBROOT"
}

ensure_host_nginx() {
    if ! command -v nginx >/dev/null 2>&1; then
        if ss -ltn | awk '$4 ~ /:(80|443)$/ { found = 1 } END { exit !found }'; then
            fail "Ports 80 or 443 are already in use, but no $NGINX_CONTAINER container was found. Configure the existing proxy or run with PROXY_MODE=docker and NGINX_CONTAINER=<name>."
        fi

        info "Installing host Nginx"
        apt-get update
        apt-get install -y nginx
    fi

    systemctl enable --now nginx

    if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
        NGINX_CONFIG="/etc/nginx/sites-available/wafa-copy-domains.conf"
        ln -sfn "$NGINX_CONFIG" /etc/nginx/sites-enabled/wafa-copy-domains.conf
    else
        mkdir -p /etc/nginx/conf.d
        NGINX_CONFIG="/etc/nginx/conf.d/wafa-copy-domains.conf"
    fi

    CERTBOT_WEBROOT="/var/www/certbot"
    mkdir -p "$CERTBOT_WEBROOT"
}

configure_proxy() {
    case "$PROXY_MODE" in
        auto)
            if docker container inspect "$NGINX_CONTAINER" >/dev/null 2>&1; then
                PROXY_MODE="docker"
                configure_docker_nginx
            else
                PROXY_MODE="host"
                ensure_host_nginx
            fi
            ;;
        docker)
            docker container inspect "$NGINX_CONTAINER" >/dev/null 2>&1 || fail "Container $NGINX_CONTAINER is not running. Set NGINX_CONTAINER to the active proxy name or use PROXY_MODE=host."
            configure_docker_nginx
            ;;
        host)
            ensure_host_nginx
            ;;
        *)
            fail "PROXY_MODE must be auto, docker, or host."
            ;;
    esac
}

remove_existing_copy_block() {
    local source_file="$1" destination_file="$2"
    awk '
        /# BEGIN WAFA COPY DOMAINS/ { skip = 1; next }
        /# END WAFA COPY DOMAINS/ { skip = 0; next }
        !skip { print }
    ' "$source_file" > "$destination_file"
}

install_proxy_block() {
    local mode="$1" block_file clean_file candidate_file last_brace_line

    if [ "$PROXY_MODE" = "host" ]; then
        install_host_proxy_block "$mode"
        return
    fi
    block_file="$(mktemp)"
    clean_file="$(mktemp)"
    candidate_file="$(mktemp)"

    if [ "$mode" = "http" ]; then
        cat > "$block_file" <<'EOF'
    # BEGIN WAFA COPY DOMAINS
    # Managed by /opt/wafa-copy/setup-copy-domains.sh. Do not edit inside markers.
    server {
        listen 80;
        listen [::]:80;
        server_name YourQcm.online backend.YourQcm.online;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 404;
        }
    }
    # END WAFA COPY DOMAINS
EOF
    else
        cat > "$block_file" <<'EOF'
    # BEGIN WAFA COPY DOMAINS
    # Managed by /opt/wafa-copy/setup-copy-domains.sh. Do not edit inside markers.
    server {
        listen 80;
        listen [::]:80;
        server_name YourQcm.online backend.YourQcm.online;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;
        server_name YourQcm.online;

        ssl_certificate /etc/letsencrypt/live/YourQcm.online/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/YourQcm.online/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        location / {
            proxy_pass http://__COPY_FRONTEND_CONTAINER__:80;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90s;
        }
    }

    # The application itself uses same-origin /api/v1. This hostname is kept
    # for integrations that need a direct API endpoint; it never serves React.
    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;
        server_name backend.YourQcm.online;

        ssl_certificate /etc/letsencrypt/live/YourQcm.online/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/YourQcm.online/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        location /api/ {
            proxy_pass http://__COPY_FRONTEND_CONTAINER__:80;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90s;
        }

        location /uploads/ {
            proxy_pass http://__COPY_FRONTEND_CONTAINER__:80;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            return 404;
        }
    }
    # END WAFA COPY DOMAINS
EOF
        sed -i "s/__COPY_FRONTEND_CONTAINER__/${COPY_FRONTEND_CONTAINER}/g" "$block_file"
    fi

    remove_existing_copy_block "$NGINX_CONFIG" "$clean_file"
    last_brace_line="$(grep -n '^[[:space:]]*}[[:space:]]*$' "$clean_file" | tail -n 1 | cut -d: -f1)"
    [ -n "$last_brace_line" ] || fail "Could not find the final http block closing brace in $NGINX_CONFIG"

    head -n "$((last_brace_line - 1))" "$clean_file" > "$candidate_file"
    printf '\n' >> "$candidate_file"
    cat "$block_file" >> "$candidate_file"
    tail -n "+$last_brace_line" "$clean_file" >> "$candidate_file"
    cp "$candidate_file" "$NGINX_CONFIG"

    rm -f "$block_file" "$clean_file" "$candidate_file"
}

install_host_proxy_block() {
    local mode="$1"

    if [ "$mode" = "http" ]; then
        cat > "$NGINX_CONFIG" <<'EOF'
# Managed by /opt/wafa-copy/setup-copy-domains.sh.
server {
    listen 80;
    listen [::]:80;
    server_name YourQcm.online backend.YourQcm.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 404;
    }
}
EOF
        return
    fi

    cat > "$NGINX_CONFIG" <<'EOF'
# Managed by /opt/wafa-copy/setup-copy-domains.sh.
server {
    listen 80;
    listen [::]:80;
    server_name YourQcm.online backend.YourQcm.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name YourQcm.online;

    ssl_certificate /etc/letsencrypt/live/YourQcm.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YourQcm.online/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:__COPY_FRONTEND_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name backend.YourQcm.online;

    ssl_certificate /etc/letsencrypt/live/YourQcm.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YourQcm.online/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://127.0.0.1:__COPY_FRONTEND_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:__COPY_FRONTEND_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        return 404;
    }
}
EOF
    sed -i "s/__COPY_FRONTEND_PORT__/${COPY_FRONTEND_PORT}/g" "$NGINX_CONFIG"
}

validate_and_reload_nginx() {
    if [ "$PROXY_MODE" = "docker" ]; then
        nginx_test=(docker exec "$NGINX_CONTAINER" nginx -t)
        nginx_reload=(docker exec "$NGINX_CONTAINER" nginx -s reload)
    else
        nginx_test=(nginx -t)
        nginx_reload=(systemctl reload nginx)
    fi

    if ! "${nginx_test[@]}"; then
        if [ "$NGINX_CONFIG_EXISTED" = "true" ]; then
            cp "$NGINX_BACKUP" "$NGINX_CONFIG"
        else
            rm -f "$NGINX_CONFIG"
        fi
        "${nginx_reload[@]}" || true
        fail "Nginx rejected the generated configuration. The backup was restored."
    fi

    "${nginx_reload[@]}"
}

install_certbot() {
    if command -v certbot >/dev/null 2>&1; then
        return
    fi

    info "Installing Certbot"
    apt-get update
    apt-get install -y certbot
}

main() {
    require_root
    require_command docker
    require_command curl
    require_command getent
    validate_email

    find_copy_frontend
    curl -fsS "http://127.0.0.1:${COPY_FRONTEND_PORT}/api/v1/test" >/dev/null || fail "WAFA Copy is not reachable at 127.0.0.1:${COPY_FRONTEND_PORT}. Start the Copy frontend before configuring domains."
    configure_proxy
    validate_dns

    NGINX_CONFIG_EXISTED="false"
    if [ -f "$NGINX_CONFIG" ]; then
        NGINX_CONFIG_EXISTED="true"
        NGINX_BACKUP="${NGINX_CONFIG}.before-wafa-copy-$(date +%Y%m%d%H%M%S).bak"
        cp -a "$NGINX_CONFIG" "$NGINX_BACKUP"
        info "Backed up Nginx configuration to $NGINX_BACKUP"
    fi

    info "Installing the HTTP ACME challenge route"
    install_proxy_block http
    validate_and_reload_nginx

    install_certbot
    info "Requesting/renewing one certificate for $FRONTEND_DOMAIN and $BACKEND_DOMAIN"
    certbot certonly --webroot --non-interactive --agree-tos --email "$LETSENCRYPT_EMAIL" \
        --cert-name "$FRONTEND_DOMAIN" --expand --keep-until-expiring \
        -w "$CERTBOT_WEBROOT" -d "$FRONTEND_DOMAIN" -d "$BACKEND_DOMAIN"

    info "Enabling HTTPS proxy routes"
    install_proxy_block https
    validate_and_reload_nginx

    update_runtime_domains

    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    if [ "$PROXY_MODE" = "docker" ]; then
        printf '#!/usr/bin/env sh\ndocker exec %q nginx -s reload\n' "$NGINX_CONTAINER" \
            > /etc/letsencrypt/renewal-hooks/deploy/reload-wafa-copy-proxy.sh
    else
        printf '#!/usr/bin/env sh\nsystemctl reload nginx\n' \
            > /etc/letsencrypt/renewal-hooks/deploy/reload-wafa-copy-proxy.sh
    fi
    chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-wafa-copy-proxy.sh

    curl -fsS --resolve "$FRONTEND_DOMAIN:443:127.0.0.1" "https://$FRONTEND_DOMAIN/api/v1/test" >/dev/null
    curl -fsS --resolve "$BACKEND_DOMAIN:443:127.0.0.1" "https://$BACKEND_DOMAIN/api/v1/test" >/dev/null

    echo
    echo "Done."
    echo "Frontend: https://$FRONTEND_DOMAIN"
    echo "Backend:  https://$BACKEND_DOMAIN/api/v1"
}

main "$@"
