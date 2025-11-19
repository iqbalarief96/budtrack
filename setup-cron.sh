#!/bin/bash

# ============================================
# BudTrack - Setup Cron Job for Budget Reset
# ============================================
# This script helps you set up automatic budget reset
# that runs daily at midnight (00:00)

echo "=========================================="
echo "BudTrack Budget Reset - Cron Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: Not running as root. You might need sudo permissions.${NC}"
    echo ""
fi

# Get the application URL
echo -e "${GREEN}Step 1: Application URL${NC}"
read -p "Enter your application URL (e.g., https://budtrack.yourdomain.com): " APP_URL

# Remove trailing slash if present
APP_URL="${APP_URL%/}"

# Get the API key
echo ""
echo -e "${GREEN}Step 2: API Key${NC}"
echo "This should match the CRON_API_KEY in your .env file"
read -p "Enter your CRON_API_KEY: " API_KEY

# Validate inputs
if [ -z "$APP_URL" ] || [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: URL and API Key are required!${NC}"
    exit 1
fi

# Create the cron job command
CRON_COMMAND="0 0 * * * curl -X POST \"$APP_URL/api/budgets/reset\" -H \"Authorization: Bearer $API_KEY\" >> /var/log/budtrack-cron.log 2>&1"

echo ""
echo -e "${GREEN}Step 3: Installing Cron Job${NC}"
echo "This will run daily at midnight (00:00)"
echo ""
echo "Cron command:"
echo "$CRON_COMMAND"
echo ""

read -p "Do you want to install this cron job? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create log directory if it doesn't exist
    sudo mkdir -p /var/log
    sudo touch /var/log/budtrack-cron.log
    sudo chmod 644 /var/log/budtrack-cron.log

    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Cron job installed successfully!${NC}"
        echo ""
        echo "Details:"
        echo "- Runs: Daily at midnight (00:00)"
        echo "- Endpoint: $APP_URL/api/budgets/reset"
        echo "- Log file: /var/log/budtrack-cron.log"
        echo ""
        echo "Current crontab:"
        crontab -l | grep "budgets/reset"
        echo ""
        echo -e "${YELLOW}To view logs:${NC}"
        echo "  tail -f /var/log/budtrack-cron.log"
        echo ""
        echo -e "${YELLOW}To test the cron job manually:${NC}"
        echo "  curl -X POST \"$APP_URL/api/budgets/reset\" -H \"Authorization: Bearer $API_KEY\""
    else
        echo -e "${RED}✗ Failed to install cron job${NC}"
        exit 1
    fi
else
    echo ""
    echo "Cron job installation cancelled."
    echo ""
    echo -e "${YELLOW}To install manually, add this line to your crontab (crontab -e):${NC}"
    echo "$CRON_COMMAND"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
