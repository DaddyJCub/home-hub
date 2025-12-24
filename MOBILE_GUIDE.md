# HomeHub Mobile Guide

## Quick Start

### Installing as a PWA (Progressive Web App)

#### iOS (iPhone/iPad)
1. Open HomeHub in Safari
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "HomeHub" and tap **Add**
5. The HomeHub icon now appears on your home screen
6. Launch it like any native app!

#### Android
1. Open HomeHub in Chrome
2. Tap the menu (⋮)
3. Tap **"Add to Home Screen"** or **"Install App"**
4. Confirm the installation
5. The HomeHub icon appears in your app drawer
6. Launch it like any native app!

## Mobile Features

### 1. Customizable Navigation Bar

**Why it's useful**: Personalize your bottom navigation to show only the features you use most.

**How to customize**:
1. Tap **More** (gear icon) in the bottom navigation
2. Scroll to **Mobile Navigation** card
3. Tap **Customize Navigation**
4. Toggle tabs on/off (keep 3-5 enabled for best experience)
5. Changes apply instantly!

**Pro tips**:
- Keep 3-4 tabs for less cluttered navigation
- Use 5 tabs if you frequently switch between all features
- Your customization is saved and persists across sessions

### 2. Swipe Gesture Navigation

**Why it's useful**: Navigate faster with one hand using natural swipe gestures.

**How to use**:
- **Swipe left**: Go to next tab (→)
- **Swipe right**: Go to previous tab (←)
- Works in a loop through your enabled tabs

**Pro tips**:
- Swipe from anywhere on the main content area
- Gestures only work on mobile for safety
- Minimum 100px swipe distance prevents accidental navigation

### 3. Offline Mode

**Why it's useful**: Full functionality even without internet connection - perfect for basement storage rooms, remote locations, or airplane mode.

**How it works**:
- **Automatic**: Service worker caches everything on first visit
- **Visual feedback**: Red banner appears at top when offline
- **Data safety**: All changes saved locally
- **Auto-sync**: Changes sync automatically when connection returns

**What works offline**:
- ✅ View all your data
- ✅ Add/edit chores, shopping items, meals, recipes
- ✅ Mark items complete
- ✅ Switch between households
- ✅ Customize settings
- ❌ AI features (meal planning, recipe parsing) - require connection

**Pro tips**:
- Visit all tabs once while online to cache everything
- Don't worry about losing data - it's all saved locally
- Check the offline banner to know your sync status

### 4. App Updates

**Why it's useful**: Get new features without manual updates, with zero disruption.

**How it works**:
- **Automatic detection**: Service worker checks for updates
- **Non-intrusive**: Orange banner appears at bottom with "Update" button
- **One-click update**: Tap "Update" to refresh with new version
- **Data preserved**: Your data remains intact during updates

**Pro tips**:
- Update when convenient - no rush
- Updates are quick (just a refresh)
- You can keep using the app while update is available

## Mobile Optimization Details

### Touch Targets
- All interactive elements are at least 44×44px
- Bigger tap areas on mobile for easier interaction
- Navigation icons are 22px for optimal thumb reach

### Layout Adaptations
- Header is more compact on mobile
- Cards stack vertically for better scrolling
- Forms use mobile-optimized inputs
- Dialogs take full height on mobile

### Performance
- Service worker caches all assets
- Instant page loads after first visit
- Minimal data usage
- Smooth 60fps animations

### Safe Areas
- Respects iPhone notch and Dynamic Island
- Bottom navigation accounts for home indicator
- Content never hidden by system UI

## Keyboard Shortcuts (PWA on Desktop)

When using HomeHub PWA on desktop:
- **Cmd/Ctrl + 1-7**: Switch between tabs
- **Cmd/Ctrl + ,**: Open settings
- **Escape**: Close dialogs

## Troubleshooting

### App Not Installing
- **iOS**: Must use Safari (not Chrome or Firefox)
- **Android**: Chrome, Edge, or Samsung Internet work
- Clear browser cache and try again

### Offline Mode Not Working
- Visit the app at least once while online
- Check browser storage permissions
- Try reinstalling the PWA

### Swipe Gestures Not Working
- Only work on mobile browsers
- Swipe from content area (not edges)
- Ensure you're swiping at least 100px

### Updates Not Appearing
- Service worker updates on page refresh
- May take a few minutes to detect new versions
- Force refresh: Close all tabs and reopen

## Privacy & Data

### Where is data stored?
- Locally on your device using IndexedDB
- Synced across your devices via spark.kv
- Never shared with third parties

### What happens if I clear browser data?
- All local data is deleted
- Data synced to cloud remains safe
- Refresh to re-sync from cloud

### Can I use HomeHub on multiple devices?
- Yes! Data syncs across all devices
- Works on phone, tablet, desktop simultaneously
- Changes sync in real-time when online

## Tips for Best Experience

1. **Install as PWA**: Get the full native app experience
2. **Customize navigation**: Show only tabs you use regularly
3. **Use gestures**: Faster one-handed navigation
4. **Don't worry about offline**: The app handles it automatically
5. **Update when ready**: Updates are quick and preserve your data
6. **Add shortcuts**: Use PWA shortcuts for quick access to specific features

## Getting Help

If you encounter issues:
1. Try force-refreshing the page (pull down to refresh)
2. Check if you're in offline mode
3. Clear site data and re-sync
4. Reinstall the PWA
5. Check console for errors (if technical)

## What's New in This Update

✨ **Customizable Navigation**: Choose 3-5 tabs for your bottom nav
🚀 **Swipe Gestures**: Navigate with natural swipes
📱 **Offline Mode**: Full functionality without internet
🔄 **Smart Updates**: One-click app updates with preserved data
🎯 **Better Touch Targets**: Easier interaction on mobile
⚡ **Faster Loading**: Service worker caching for instant loads
