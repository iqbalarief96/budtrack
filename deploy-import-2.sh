#!/bin/bash

# Timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/www/budtrack/backup_$TIMESTAMP"

# Create backup directory
echo "📦 Creating backup directory..."
mkdir -p $BACKUP_DIR

# Backup existing files
echo "💾 Backing up current files..."
cp -r /var/www/budtrack/app /var/www/budtrack/components /var/www/budtrack/lib $BACKUP_DIR/

# Install csv-parse dependency if needed
echo "📚 Installing dependencies..."
cd /var/www/budtrack && npm install csv-parse --save

# Create new directories if needed
echo "🔄 Creating directories..."
mkdir -p /var/www/budtrack/app/api/import
mkdir -p /var/www/budtrack/app/components
mkdir -p /var/www/budtrack/app/transactions

# Copy new files
echo "📋 Copying files..."
cp -f /var/www/budtrack/tmp/route.ts /var/www/budtrack/app/api/import/
cp -f /var/www/budtrack/tmp/ImportTransactions.tsx /var/www/budtrack/app/components/
cp -f /var/www/budtrack/tmp/page.tsx /var/www/budtrack/app/transactions/

# Copy pre-built .next directory
echo "📂 Copying built files..."
if [ -d "/var/www/budtrack/tmp/.next" ]; then
  cp -rf /var/www/budtrack/tmp/.next/* /var/www/budtrack/.next/
  chmod -R 755 /var/www/budtrack/.next
fi

# Restart the service
echo "🚀 Restarting service..."
pm2 restart budtrack

echo "✅ Deployment completed successfully!"
echo "If there are any issues, you can restore from backup at $BACKUP_DIR" 