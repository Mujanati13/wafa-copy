#!/bin/bash

# Quick CORS Fix Script
# Run this on your VPS to fix CORS errors immediately

echo "🔧 Fixing CORS Configuration..."

# Step 1: Check if .env exists, if not create it
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# CORS Configuration - Add all domains that should access your API
CORS_ORIGIN=https://yourqcm.online

# Session and JWT secrets (CHANGE THESE!)
SESSION_SECRET=change_this_session_secret_in_production
JWT_SECRET=change_this_jwt_secret_in_production
EOF
    echo "✅ .env file created"
else
    echo "📝 .env file exists"
    
    # Check if CORS_ORIGIN is already in .env
    if ! grep -q "^CORS_ORIGIN=" .env; then
        echo "Adding CORS_ORIGIN to .env..."
        echo "" >> .env
        echo "# CORS Configuration" >> .env
        echo "CORS_ORIGIN=https://yourqcm.online" >> .env
        echo "✅ CORS_ORIGIN added"
    else
        echo "✅ CORS_ORIGIN already exists in .env"
        echo "Current value:"
        grep "^CORS_ORIGIN=" .env
    fi
fi

# Step 2: Show current backend CORS config
echo ""
echo "📊 Current Backend CORS Configuration:"
docker-compose exec -T backend printenv CORS_ORIGIN 2>/dev/null || echo "⚠️  Cannot read - backend may not be running"

# Step 3: Restart backend to apply changes
echo ""
echo "🔄 Restarting backend service..."
docker-compose restart backend

# Step 4: Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Step 5: Check new CORS config
echo ""
echo "✅ New Backend CORS Configuration:"
docker-compose exec -T backend printenv CORS_ORIGIN 2>/dev/null || echo "⚠️  Backend not responding yet, wait a few more seconds"

# Step 6: Test backend health
echo ""
echo "🏥 Testing backend health..."
if curl -s -f http://localhost:5010/api/v1/test > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend may still be starting..."
fi

echo ""
echo "🎯 CORS Fix Complete!"
echo ""
echo "Next steps:"
echo "1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "2. Do a hard refresh (Ctrl+Shift+R)"
echo "3. Try your app again"
echo ""
echo "If still not working, check backend logs:"
echo "  docker-compose logs backend --tail=50"
