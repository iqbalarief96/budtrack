#!/bin/bash

# Emergency database recovery script
# This script will search for database backups and attempt recovery

set +e  # Don't exit on error, we want to try everything

echo "========================================="
echo "EMERGENCY DATABASE RECOVERY"
echo "========================================="
echo ""

DB_PATH="/var/www/budtrack/prisma/prod.db"
FOUND_BACKUP=""

echo "Step 1: Searching entire filesystem for database backups..."
echo "-----------------------------------------------------------"

# Search in common backup locations
SEARCH_LOCATIONS=(
    "/var/backups"
    "/root"
    "/tmp"
    "/var/www"
    "/home"
    "/opt/backups"
)

for location in "${SEARCH_LOCATIONS[@]}"; do
    echo "Searching in $location..."
    if [ -d "$location" ]; then
        found=$(find "$location" -name "*prod.db*" -o -name "*.db.backup*" -o -name "budtrack*.db*" 2>/dev/null)
        if [ ! -z "$found" ]; then
            echo "FOUND POTENTIAL BACKUPS:"
            echo "$found"
            FOUND_BACKUP="$found"
        fi
    fi
done

echo ""
echo "Step 2: Checking for automated backup cron jobs..."
echo "-----------------------------------------------------------"
crontab -l 2>/dev/null | grep -i backup || echo "No backup cron jobs found"
ls -la /etc/cron.* 2>/dev/null | grep -i backup || echo "No system backup cron jobs found"

echo ""
echo "Step 3: Checking cloud provider automatic backups..."
echo "-----------------------------------------------------------"
if command -v doctl &> /dev/null; then
    echo "DigitalOcean CLI found - check your DO control panel for snapshots"
elif [ -d "/var/lib/cloud" ]; then
    echo "Cloud instance detected - check your cloud provider control panel for snapshots"
else
    echo "No cloud CLI tools found"
fi

echo ""
echo "Step 4: Checking if filesystem has recovery capabilities..."
echo "-----------------------------------------------------------"

# Check if extundelete is available
if command -v extundelete &> /dev/null; then
    echo "extundelete is available - attempting recovery..."
    partition=$(df /var/www/budtrack | tail -1 | awk '{print $1}')
    echo "Partition: $partition"
    echo "Note: This requires unmounting the partition (not recommended on running system)"
else
    echo "extundelete not available (can install with: apt-get install extundelete)"
fi

# Check if testdisk is available
if command -v testdisk &> /dev/null; then
    echo "testdisk is available for manual recovery"
else
    echo "testdisk not available (can install with: apt-get install testdisk)"
fi

echo ""
echo "Step 5: Checking recent file deletions in journal..."
echo "-----------------------------------------------------------"
if command -v debugfs &> /dev/null; then
    echo "debugfs available - checking for recently deleted inodes..."
    # This is read-only and safe
    partition=$(df /var/www/budtrack | tail -1 | awk '{print $1}')
    echo "Partition: $partition"
    echo "Run manually: debugfs -R 'lsdel' $partition"
else
    echo "debugfs not available"
fi

echo ""
echo "========================================="
echo "RECOVERY OPTIONS"
echo "========================================="
echo ""

if [ ! -z "$FOUND_BACKUP" ]; then
    echo "✓ FOUND POTENTIAL BACKUP FILES!"
    echo ""
    echo "To restore, choose the most recent backup and run:"
    echo ""
    for backup in $FOUND_BACKUP; do
        backup_size=$(du -h "$backup" 2>/dev/null | cut -f1)
        backup_date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1)
        echo "  cp \"$backup\" $DB_PATH"
        echo "  Size: $backup_size | Date: $backup_date"
        echo ""
    done
else
    echo "✗ No automatic backups found on filesystem"
    echo ""
    echo "OPTION A: Check your VPS provider control panel"
    echo "  - DigitalOcean: Snapshots & Backups section"
    echo "  - Vultr: Snapshots section"
    echo "  - AWS: EBS Snapshots"
    echo "  - Other: Check for volume/instance snapshots"
    echo ""
    echo "OPTION B: If you have a local copy of the database"
    echo "  scp /path/to/local/prod.db root@your-vps:/var/www/budtrack/prisma/"
    echo ""
    echo "OPTION C: Recreate database (DATA WILL BE LOST)"
    echo "  cd /var/www/budtrack"
    echo "  npx prisma db push --accept-data-loss"
    echo "  pm2 restart budtrack"
    echo ""
fi

echo "========================================="
echo "Checking current database status..."
echo "========================================="
echo ""

if [ -f "$DB_PATH" ]; then
    db_size=$(du -h "$DB_PATH" | cut -f1)
    echo "Database exists: $DB_PATH (Size: $db_size)"
else
    echo "Database does NOT exist: $DB_PATH"
fi

echo ""
echo "Recovery script complete."
echo ""
