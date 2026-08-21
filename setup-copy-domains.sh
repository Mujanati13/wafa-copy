#!/usr/bin/env bash
# Configure the two public WAFA Copy domains on the VPS that already runs
# the main WAFA `wafa-nginx` container.
#
# Usage:
#   sudo ./setup-copy-domains.sh admin@example.com
#
# Prerequisites:
#   * DNS A records for copy.imrs-qcm.com and backend.copy.imrs-qcm.com point
#     to this VPS.
#   * The WAFA Copy stack has been deployed (`./deploy-second-instance.sh`).
#   * The Copy frontend is connected to the main stack's shared Docker network.

set -euo pipefail

FRONTEND_DOMAIN="copy.imrs-qcm.com"
BACKEND_DOMAIN="backend.copy.imrs-qcm.com"
NGINX_CONTAINER="${NGINX_CONTAINER:-wafa-nginx}"
COPY_FRONTEND_CONTAINER="${COPY_FRONTEND_CONTAINER:-wafa-copy-frontend-1}"
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

find_copy_frontend() {
    if docker container inspect "$COPY_FRONTEND_CONTAINER" >/dev/null 2>&1; then
        return
    fi

    COPY_FRONTEND_CONTAINER="$(docker ps --format '{{.Names}}' | awk '/^wafa-copy-frontend-[0-9]+$/ { print; exit }')"
    [ -n "$COPY_FRONTEND_CONTAINER" ] || fail "The WAFA Copy frontend container is not running. Run ./deploy-second-instance.sh first."
}

find_nginx_mounts() {
    NGINX_CONFIG="$(docker inspect "$NGINX_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/nginx.conf"}}{{.Source}}{{end}}{{end}}')"
    CERTBOT_WEBROOT="$(docker inspect "$NGINX_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/var/www/certbot"}}{{.Source}}{{end}}{{end}}')"

    [ -n "$NGINX_CONFIG" ] || fail "Could not locate the host Nginx configuration mounted by $NGINX_CONTAINER."
    [ -f "$NGINX_CONFIG" ] || fail "Nginx configuration file does not exist: $NGINX_CONFIG"
    [ -n "$CERTBOT_WEBROOT" ] || fail "Could not locate the Certbot webroot mounted by $NGINX_CONTAINER."
    mkdir -p "$CERTBOT_WEBROOT"
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
        server_name copy.imrs-qcm.com backend.copy.imrs-qcm.com;

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
        server_name copy.imrs-qcm.com backend.copy.imrs-qcm.com;

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
        server_name copy.imrs-qcm.com;

        ssl_certificate /etc/letsencrypt/live/copy.imrs-qcm.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/copy.imrs-qcm.com/privkey.pem;
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
        server_name backend.copy.imrs-qcm.com;

        ssl_certificate /etc/letsencrypt/live/copy.imrs-qcm.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/copy.imrs-qcm.com/privkey.pem;
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

validate_and_reload_nginx() {
    if ! docker exec "$NGINX_CONTAINER" nginx -t; then
        cp "$NGINX_BACKUP" "$NGINX_CONFIG"
        docker exec "$NGINX_CONTAINER" nginx -s reload || true
        fail "Nginx rejected the generated configuration. The backup was restored."
    fi

    docker exec "$NGINX_CONTAINER" nginx -s reload
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

    docker container inspect "$NGINX_CONTAINER" >/dev/null 2>&1 || fail "Container $NGINX_CONTAINER is not running. Start the main WAFA stack first."
    find_copy_frontend
    find_nginx_mounts
    validate_dns

    NGINX_BACKUP="${NGINX_CONFIG}.before-wafa-copy-$(date +%Y%m%d%H%M%S).bak"
    cp -a "$NGINX_CONFIG" "$NGINX_BACKUP"
    info "Backed up Nginx configuration to $NGINX_BACKUP"

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

    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    printf '#!/usr/bin/env sh\ndocker exec %q nginx -s reload\n' "$NGINX_CONTAINER" \
        > /etc/letsencrypt/renewal-hooks/deploy/reload-wafa-nginx.sh
    chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-wafa-nginx.sh

    curl -fsS --resolve "$FRONTEND_DOMAIN:443:127.0.0.1" "https://$FRONTEND_DOMAIN/api/v1/test" >/dev/null
    curl -fsS --resolve "$BACKEND_DOMAIN:443:127.0.0.1" "https://$BACKEND_DOMAIN/api/v1/test" >/dev/null

    echo
    echo "Done."
    echo "Frontend: https://$FRONTEND_DOMAIN"
    echo "Backend:  https://$BACKEND_DOMAIN/api/v1"
}

main "$@"
