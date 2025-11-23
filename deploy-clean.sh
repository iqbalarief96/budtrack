#!/bin/bash

# Complete cache-clearing deployment script for VPS
# This script forcefully clears all Next.js caches and rebuilds from scratch

set -e  # Exit on error

echo "========================================="
echo "Starting Complete Clean Deployment"
echo "========================================="

# Navigate to project directory
cd /var/www/budtrack

# Stop the application
echo ""
echo "1. Stopping PM2 application..."
pm2 stop budtrack || true

# Pull latest code
echo ""
echo "2. Pulling latest code from main..."
git fetch origin main
git reset --hard origin/main
git clean -fdx -e node_modules -e .env.local -e .env -e prisma/prod.db

# Show current commit
echo ""
echo "3. Current commit:"
git log -1 --oneline

# Verify the fix is in the code
echo ""
echo "4. Verifying emergency fund fix is present..."
if grep -q "const targetAmount = user.emergencyFund.targetAmount" lib/safeToSpend.ts; then
    echo "✓ Fix verified: Found new emergency fund calculation"
else
    echo "✗ WARNING: New emergency fund calculation not found!"
    echo "Checking what's in the file..."
    grep -A 10 "User-level emergency fund calculation" lib/safeToSpend.ts || true
fi

# Complete cache clearing
echo ""
echo "5. Removing all cache directories..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc

# Reinstall dependencies to ensure consistency
echo ""
echo "6. Reinstalling dependencies..."
npm ci

# Build from scratch
echo ""
echo "7. Building application from scratch..."
NODE_ENV=production npm run build

# Clear PM2 logs
echo ""
echo "8. Clearing PM2 logs..."
pm2 flush

# Restart application
echo ""
echo "9. Starting application..."
pm2 start budtrack

# Wait a moment for app to start
sleep 3

# Show recent logs
echo ""
echo "10. Recent logs:"
pm2 logs budtrack --lines 20 --nostream

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the Safe to Spend widget"
echo "2. Check logs with: pm2 logs budtrack"
echo "3. Look for 'targetAmount' in logs (not 'proportionalTarget')"
echo ""
