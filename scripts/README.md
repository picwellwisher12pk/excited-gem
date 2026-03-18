# Windows Development Sync

This directory contains scripts for automatic syncing of build files from WSL to Windows during development.

## Scripts

### `sync-build.sh` (Original)
- Basic polling sync script
- Runs every 1 second
- Fallback method if inotify-tools is not available

### `sync-build-enhanced.sh` (Recommended)
- Enhanced sync script with better logging and error handling
- Uses `inotifywait` for efficient file watching (reacts to actual file changes)
- Provides colored output and detailed logging
- Includes error checking and validation
- Falls back to polling if inotify-tools is not available

## Usage

The `dev:win` command in package.json automatically uses the enhanced sync script:

```bash
npm run dev:win
```

This will:
1. Start the Plasmo development server
2. Start the enhanced sync script in the background
3. Automatically sync any build changes to Windows
4. Properly clean up processes when stopped

## Requirements

- `inotify-tools` package for efficient file watching (recommended)
- Properly configured WSL Windows mount

### Install inotify-tools:
```bash
sudo apt update
sudo apt install inotify-tools
```

## Configuration

Edit the `SOURCE` and `DEST` variables in the sync scripts if you need to change:
- Source directory: `build/chrome-mv3-dev/`
- Windows destination: `/mnt/c/Users/amir/Documents/Projects/Personal/excited-gem/build/chrome-mv3-dev/`

## Logging

The enhanced script logs to:
- Console output (with colors)
- Log file: `/tmp/excited-gem-sync.log`

## Troubleshooting

1. **Windows directory not accessible**: Check your WSL Windows mount configuration
2. **Build directory doesn't exist**: Make sure to run `npm run dev` first
3. **Sync not working**: Check the log file for error messages
