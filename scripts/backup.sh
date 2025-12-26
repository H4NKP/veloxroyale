#!/bin/bash

# VeloxAI Panel Backup Script
# Creates a compressed archive of the project and database

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
CONFIG_FILE="database_config.json"
DB_DUMP="database_backup.sql"
PREFIX=${1:-"backup"} # user_2, user_admin, etc.
FILENAME="${PREFIX}_${TIMESTAMP}.tar.gz"

# 1. Attempt Database Dump if configured
if [ -f "$CONFIG_FILE" ]; then
    echo "Database configuration found. Attempting dump..."
    # Simple extraction of values using grep/sed to avoid dependency on 'jq'
    DB_HOST=$(grep -o '"host": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    DB_USER=$(grep -o '"user": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    DB_PASS=$(grep -o '"password": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    DB_NAME=$(grep -o '"database": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    DB_ENABLED=$(grep -o '"enabled": *[^,}]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')

    if [ "$DB_ENABLED" = "true" ]; then
        echo "Exporting database: $DB_NAME..."
        MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "$DB_DUMP" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "Database dump successful."
        else
            echo "Warning: Database dump failed. Check credentials."
        fi
    fi
fi

# 2. Create archive
echo "Creating archive: $FILENAME"

tar -czf "$BACKUP_DIR/$FILENAME" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    --exclude="backups" \
    .

# Cleanup dump file
[ -f "$DB_DUMP" ] && rm "$DB_DUMP"

if [ $? -eq 0 ]; then
    echo "Backup successful: $FILENAME"
    # Return numerical size in bytes for the API to parse (Linux du -b)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        size=$(du -b "$BACKUP_DIR/$FILENAME" | cut -f1)
    else
        # Mac fallback
        size=$(stat -f%z "$BACKUP_DIR/$FILENAME")
    fi
    echo "SIZE_BYTES:$size"
else
    echo "Error: Backup failed."
    exit 1
fi
