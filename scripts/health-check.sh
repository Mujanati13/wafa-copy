#!/bin/bash

################################################################################
# Service Health Check
# Checks the health status of all services
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Change to project directory
cd "$(dirname "$0")/.."

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}WAFA Service Health Check${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check Docker containers
echo -e "${YELLOW}Docker Containers:${NC}"
services=("mongodb" "backend" "frontend" "nginx" "certbot")

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        echo -e "  ${GREEN}✓ $service is running${NC}"
    else
        echo -e "  ${RED}✗ $service is not running${NC}"
    fi
done

echo ""

# Check endpoints
echo -e "${YELLOW}Endpoint Health:${NC}"

# Backend API
if curl -s -f --max-time 5 https://backend.atlas-qcm.online/api/v1/test > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend API (https://backend.atlas-qcm.online)${NC}"
else
    echo -e "  ${RED}✗ Backend API is not responding${NC}"
fi

# Frontend
if curl -s -f --max-time 5 https://atlas-qcm.online > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Frontend (https://atlas-qcm.online)${NC}"
else
    echo -e "  ${RED}✗ Frontend is not responding${NC}"
fi

echo ""

# Check SSL certificates
echo -e "${YELLOW}SSL Certificates:${NC}"

if [ -d "certbot/conf/live/atlas-qcm.online" ]; then
    EXPIRY=$(docker-compose run --rm certbot certificates 2>/dev/null | grep "atlas-qcm.online" -A 5 | grep "Expiry Date" | head -1)
    if [ -n "$EXPIRY" ]; then
        echo -e "  ${GREEN}✓ atlas-qcm.online${NC}"
        echo -e "    $EXPIRY"
    fi
else
    echo -e "  ${RED}✗ atlas-qcm.online certificate not found${NC}"
fi

if [ -d "certbot/conf/live/atlas-qcm.online" ]; then
    EXPIRY=$(docker-compose run --rm certbot certificates 2>/dev/null | grep "backend.atlas-qcm.online" -A 5 | grep "Expiry Date" | head -1)
    if [ -n "$EXPIRY" ]; then
        echo -e "  ${GREEN}✓ backend.atlas-qcm.online${NC}"
        echo -e "    $EXPIRY"
    fi
else
    echo -e "  ${RED}✗ backend.atlas-qcm.online certificate not found${NC}"
fi

echo ""

# Check disk usage
echo -e "${YELLOW}Disk Usage:${NC}"
df -h / | tail -1 | awk '{print "  Root: " $3 " used / " $2 " total (" $5 " used)"}'

echo ""

# Check Docker volumes
echo -e "${YELLOW}Docker Volumes:${NC}"
docker volume ls --filter name=wafa | tail -n +2 | while read -r line; do
    volume=$(echo "$line" | awk '{print $2}')
    size=$(docker system df -v | grep "$volume" | awk '{print $3}')
    echo -e "  $volume: ${size:-unknown}"
done

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Health Check Complete${NC}"
echo -e "${BLUE}================================${NC}"
