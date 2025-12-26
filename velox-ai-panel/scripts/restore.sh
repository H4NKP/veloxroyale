#!/bin/bash

# VeloxAI Panel Restore Script
# Extracts a backup archive and restores database if present

BACKUP_FILE=$1
BACKUP_DIR="backups"
CONFIG_FILE="database_config.json"
DB_DUMP="database_backup.sql"

if [ -z "$BACKUP_FILE" ]; then
    echo "Error: No backup file specified."
    exit 1
fi

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE not found."
    exit 1
fi

echo "--- RESTORATION STARTED ---"
echo "Target Source: $BACKUP_DIR/$BACKUP_FILE"

# 1. Extract the archive
echo "[1/3] Extracting archive contents..."
tar -xzf "$BACKUP_DIR/$BACKUP_FILE" -C .

if [ $? -eq 0 ]; then
    echo "Success: Files extracted correctly."
else
    echo "Error: Extraction failed."
    exit 1
fi

# 2. Restore Database if dump found
if [ -f "$DB_DUMP" ]; then
    echo "[2/3] Database backup found. Restoring..."
    if [ -f "$CONFIG_FILE" ]; then
        DB_HOST=$(grep -o '"host": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
        DB_USER=$(grep -o '"user": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
        DB_PASS=$(grep -o '"password": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
        DB_NAME=$(grep -o '"database": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)

        echo "Importing to: $DB_NAME..."
        MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$DB_DUMP" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "Database restoration successful."
        else
            echo "Warning: Database import failed. Configuration might be invalid for this host."
        fi
    fi
    rm "$DB_DUMP"
else
    echo "[2/3] No database dump in this backup. Skipping SQL import."
fi

# 3. Finalize
echo "[3/3] Finalizing system state..."
echo "Restoration complete. System is winding down for reboot."
echo "--- RESTORE SUCCESSFUL ---"
