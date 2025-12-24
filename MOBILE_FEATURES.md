# Mobile Optimization Features

## Overview
HomeHub now includes advanced mobile optimization features for a native-app-like experience on smartphones and tablets.

## Features

### 1. Customizable Bottom Navigation
- **What it does**: Choose which 3-5 tabs appear in your bottom navigation bar
- **How to use**: 
  1. Go to Settings (More tab on mobile)
  2. Find "Mobile Navigation" card
  3. Click "Customize Navigation"
  4. Toggle tabs on/off (keep 3-5 enabled)
  5. Changes apply immediately

- **Available tabs**:
  - Dashboard (Home)
  - Chores
  - Shopping
  - Meals
  - Calendar
  - Recipes
  - Settings (More)

### 2. Swipe Gestures
- **What it does**: Navigate between tabs with natural swipe gestures
- **How to use**:
  - Swipe left: Move to next tab
  - Swipe right: Move to previous tab
  - Cycles through your enabled tabs in order

### 3. Offline Mode
- **What it does**: Full app functionality without internet connection
- **Features**:
  - All pages cached for offline access
  - Changes saved locally and synced when online
  - Visual banner when offline
  - Automatic sync when connection returns

- **How it works**:
  - Service worker automatically caches app on first visit
  - Red banner appears at top when offline
  - All your changes are saved locally
  - When connection returns, changes sync automatically

### 4. App Updates
- **What it does**: Non-intrusive notifications when new app version available
- **How it works**:
  - Orange banner appears at bottom when update available
  - Click "Update" button to refresh with new version
  - Your data is preserved during update

## PWA Installation

### iOS (Safari)
1. Visit HomeHub in Safari
2. Tap the Share button
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on your home screen

### Android (Chrome)
1. Visit HomeHub in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home Screen" or "Install App"
4. Confirm installation
5. App icon appears on your home screen

## Benefits
- **Native Feel**: Feels like a real app, not a website
- **Always Available**: Works offline, perfect for quick updates
- **Personalized**: Customize navigation to match your workflow
- **Fast**: Cached content loads instantly
- **Gesture-Based**: Natural swipe navigation for one-handed use
- **Reliable**: Never lose data, even without internet

## Technical Details
- Service worker caches all assets and pages
- Uses IndexedDB for offline data storage via spark.kv
- Automatic background sync when connection returns
- Progressive enhancement: works on all devices
- Safe area insets for modern notched/dynamic island devices
