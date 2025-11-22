#!/bin/bash

# BudTrack Database Backup Script
# Automatically backs up the SQLite database with timestamp
# Keeps only the last 30 backups

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/budtrack-backups"
DB_PATH="/var/www/budtrack/prisma/prod.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database not found at $DB_PATH"
    exit 1
fi

# Backup database
echo "🔄 Starting backup..."
cp "$DB_PATH" "$BACKUP_DIR/prod_$DATE.db"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed: prod_$DATE.db"

    # Keep only last 30 backups
    cd "$BACKUP_DIR"
    BACKUP_COUNT=$(ls -1 prod_*.db 2>/dev/null | wc -l)

    if [ "$BACKUP_COUNT" -gt 30 ]; then
        echo "🗑️  Removing old backups (keeping last 30)..."
        ls -t prod_*.db | tail -n +31 | xargs rm -f
        echo "✅ Cleanup completed"
    fi

    # Show backup info
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/prod_$DATE.db" | cut -f1)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo ""
    echo "📊 Backup Info:"
    echo "   File: prod_$DATE.db"
    echo "   Size: $BACKUP_SIZE"
    echo "   Total backups: $(ls -1 prod_*.db 2>/dev/null | wc -l)"
    echo "   Total size: $TOTAL_SIZE"
    echo "   Location: $BACKUP_DIR"
else
    echo "❌ Backup failed!"
    exit 1
fi
