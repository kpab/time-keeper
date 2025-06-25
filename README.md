# Time Keeper - VSCode Extension

Force yourself to take regular breaks by temporarily disabling your VSCode editor.

## Features

- **Pomodoro-style Timer**: Set custom work and break durations
- **Complete Editor Lockdown**: All editors become read-only during breaks
- **Visual Break Screen**: Semi-transparent overlay (customizable opacity)
- **Multi-window Sync**: All VSCode windows sync break times
- **Status Bar Timer**: Always visible countdown
- **Emergency Unlock**: Override break time when absolutely necessary

## Usage

1. **Start Timer**: 
   - Command Palette: `Time Keeper: Start Timer`
   - Default: 25 minutes work, 5 minutes break

2. **Stop Timer**: 
   - Command Palette: `Time Keeper: Stop Timer`
   - Or click the timer in status bar

3. **Emergency Unlock**: 
   - Command Palette: `Time Keeper: Emergency Unlock`
   - Use only when absolutely necessary!

## Settings

Configure in VSCode settings:

- `timeKeeper.workDuration`: Work duration in minutes (default: 25)
- `timeKeeper.breakDuration`: Break duration in minutes (default: 5)
- `timeKeeper.overlayOpacity`: Break screen opacity 0.5-1.0 (default: 0.95)

## How It Works

When break time starts:
- All editors become read-only
- Dark overlay covers the screen
- Timer shows remaining break time
- Helpful tips encourage healthy habits

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

## Requirements

- VSCode 1.74.0 or higher

## License

MIT