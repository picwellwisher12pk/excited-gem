#!/bin/bash
# Enhanced sync script for WSL to Windows development
# This script watches the build directory and syncs changes to Windows

set -e  # Exit on any error

SOURCE="build/chrome-mv3-dev/"
DEST="/mnt/c/Users/amir/Documents/Projects/Personal/excited-gem/build/chrome-mv3-dev/"
LOG_FILE="/tmp/excited-gem-sync.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if source directory exists
if [ ! -d "$SOURCE" ]; then
    log_error "Source directory $SOURCE does not exist!"
    log_error "Please run 'npm run dev' first to build the extension."
    exit 1
fi

# Create destination directory
mkdir -p "$DEST"

# Check if Windows directory is accessible
if [ ! -d "$(dirname "$DEST")" ]; then
    log_error "Windows directory $(dirname "$DEST") is not accessible!"
    log_error "Please check your WSL Windows mount configuration."
    exit 1
fi

log "Starting sync from $SOURCE to $DEST"
log_success "Initial sync..."

# Initial sync
if rsync -av --delete "$SOURCE" "$DEST"; then
    log_success "Initial sync completed successfully"
else
    log_error "Initial sync failed!"
    exit 1
fi

# Function to perform sync
sync_changes() {
    if rsync -av --delete "$SOURCE" "$DEST" > /dev/null 2>&1; then
        log_success "Synced changes at $(date '+%H:%M:%S')"
    else
        log_error "Sync failed at $(date '+%H:%M:%S')"
    fi
}

# Check if inotifywait is available for efficient file watching
if command -v inotifywait >/dev/null 2>&1; then
    log_success "Using inotifywait for efficient file watching..."
    log "Watching for changes in $SOURCE"
    
    # Watch for file system events
    while inotifywait -r -e modify,create,delete,move "$SOURCE" \
        --exclude '.*\.swp.*|.*\.tmp.*|.*~|.*\.log.*' \
        --timeout 1 2>/dev/null; do
        sync_changes
    done
else
    log_warning "inotifywait not found, using polling method"
    log_warning "Install inotify-tools for better performance: sudo apt install inotify-tools"
    
    # Use polling as fallback
    log "Polling for changes every 1 second..."
    while true; do
        sync_changes
        sleep 1
    done
fi
