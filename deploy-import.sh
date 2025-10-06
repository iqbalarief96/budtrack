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

# Update codebase
echo "🔄 Updating codebase..."

# Create new API directory if it doesn't exist
mkdir -p /var/www/budtrack/app/api/import

# Copy new files
cp -f /var/www/budtrack/tmp/app/api/import/route.ts /var/www/budtrack/app/api/import/
cp -f /var/www/budtrack/tmp/app/components/ImportTransactions.tsx /var/www/budtrack/app/components/
cp -f /var/www/budtrack/tmp/app/transactions/page.tsx /var/www/budtrack/app/transactions/

# Update dependencies if needed
echo "📚 Updating dependencies..."
cd /var/www/budtrack && npm install csv-parse --save

# Build the project
echo "🔨 Building the project..."
cd /var/www/budtrack && NODE_ENV=production npm run build

# Restart the service
echo "🚀 Restarting service..."
pm2 restart budtrack

echo "✅ Deployment completed successfully!"
echo "If there are any issues, you can restore from backup at $BACKUP_DIR" 