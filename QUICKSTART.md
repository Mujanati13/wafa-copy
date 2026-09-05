# Quick Deployment Guide

## On Your VPS (Ubuntu/Debian)

### 1. Initial Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Clone your repository
cd /opt
sudo git clone <your-repo-url> wafa
cd wafa
```

### 2. Configure Environment

```bash
# Root environment (for Docker Compose)
sudo cp .env.example .env
sudo nano .env
```

**Edit these key values in .env:**
- `MONGO_ROOT_PASSWORD` - Strong password for MongoDB
- `SESSION_SECRET` - Generate: `openssl rand -base64 32`
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- `EMAIL_USER` / `EMAIL_PASSWORD` - Your Gmail & app password
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` - From PayPal dashboard
- `CLOUDINARY_*` - From Cloudinary dashboard

```bash
# Frontend environment
sudo cp wafa-frentend/.env.production.example wafa-frentend/.env.production
# Should be pre-configured with correct URLs
```

### 3. Firebase Setup

```bash
# Copy your Firebase service account JSON
sudo nano wafa-backend/firebase-service-account.json
# Paste the JSON content from Firebase Console
```

### 4. MongoDB Credentials

MongoDB credentials are now in the root `.env` file:

```bash
sudo nano .env

# Change these:
MONGO_ROOT_USERNAME=admin           # Your MongoDB username
MONGO_ROOT_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

### 5. Deploy!

```bash
# Make script executable
sudo chmod +x deploy-vps.sh
sudo chmod +x scripts/*.sh

# Run deployment
sudo ./deploy-vps.sh
```

The script will:
1. Install Docker if needed
2. Check DNS configuration
3. Build all containers
4. Obtain SSL certificates
5. Start all services
6. Configure auto-renewal

### 6. Verify Deployment

```bash
# Check service status
docker-compose ps

# Run health check
./scripts/health-check.sh

# View logs
./scripts/logs.sh
```

Visit:
- Frontend: https://YourQcm.online
- Backend: https://backend.YourQcm.online/api/v1/test

## DNS Configuration (Before Deployment)

In your domain registrar (Namecheap, GoDaddy, etc.):

```
Type    Name        Value           TTL
A       @           YOUR_VPS_IP     300
A       www         YOUR_VPS_IP     300
A       backend     YOUR_VPS_IP     300
```

Wait 5-10 minutes for DNS propagation, then verify:

```bash
dig YourQcm.online +short
dig backend.YourQcm.online +short
```

## Common Issues

### Issue: SSL certificate fails
**Solution**: Ensure DNS is propagated and ports 80/443 are open
```bash
sudo ufw allow 80
sudo ufw allow 443
```

### Issue: Backend can't connect to MongoDB
**Solution**: Check credentials match in docker-compose.yml and .env.production

### Issue: Frontend shows connection refused
**Solution**: Check CORS settings in backend .env.production
```bash
CORS_ORIGIN=https://YourQcm.online
```

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart service
docker-compose restart backend

# Rebuild after code changes
git pull
docker-compose up -d --build

# Backup database
./scripts/backup-db.sh

# Check SSL expiry
docker-compose run --rm certbot certificates
```

## Security Reminders

1. ✅ Change MongoDB password
2. ✅ Generate unique SESSION_SECRET & JWT_SECRET
3. ✅ Use Gmail app passwords (not regular password)
4. ✅ Keep firebase-service-account.json secure
5. ✅ Set PayPal to LIVE mode
6. ✅ Enable UFW firewall
7. ✅ Set up regular backups

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Need Help?

Run diagnostics:
```bash
./scripts/health-check.sh
docker-compose ps
docker stats
```

Check logs:
```bash
./scripts/logs.sh
```
