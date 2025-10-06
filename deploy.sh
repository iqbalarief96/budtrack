#!/bin/bash

# Deploy script for Budtrack

# Go to project directory
cd /var/www/budtrack

# Create backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
echo "Creating backup in $BACKUP_DIR"
mkdir -p $BACKUP_DIR
cp -r app components hooks lib prisma public types .env* package.json next.config.js tsconfig.json tailwind.config.js $BACKUP_DIR/

# Update code from uploaded source code (assuming you uploaded the new files to a temp directory)
echo "Updating codebase from uploaded files"

# If you uploaded a zip file to /tmp
if [ -f /tmp/budtrack-latest.zip ]; then
  echo "Extracting uploaded zip file"
  unzip -q -o /tmp/budtrack-latest.zip -d /tmp/budtrack-latest
  
  # Copy new files (skip node_modules and .next)
  echo "Copying new files"
  rsync -av --exclude 'node_modules' --exclude '.next' --exclude '.git' /tmp/budtrack-latest/ /var/www/budtrack/
  
  # Clean up
  rm -rf /tmp/budtrack-latest
  rm /tmp/budtrack-latest.zip
fi

# If you uploaded build files
if [ -d /tmp/budtrack-build/.next ]; then
  echo "Copying pre-built Next.js files"
  rsync -av /tmp/budtrack-build/.next/ /var/www/budtrack/.next/
  rm -rf /tmp/budtrack-build
fi

# Install any new dependencies
echo "Installing dependencies"
npm install

# Rebuild the app if needed (if you didn't upload pre-built files)
if [ ! -d ".next" ] || [ -z "$(ls -A .next)" ]; then
  echo "Building the app"
  npm run build
else
  echo "Using pre-built files, skipping build step"
fi

# Run Prisma migrations if needed
echo "Running database migrations"
npx prisma migrate deploy

# Restart the service
echo "Restarting the service"
pm2 restart budtrack || pm2 start npm --name "budtrack" -- start

echo "Deployment completed!" 