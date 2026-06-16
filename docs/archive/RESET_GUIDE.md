# Reset & Testing Guide

## How to Reset the App

You now have **two ways** to reset the app and start testing from scratch:

### 1. **Reset Button (UI)**
- Look for the small "🔄 Reset" button in the top-right corner of the header
- Click it and confirm to clear all progress
- The app will reload with fresh state

### 2. **Keyboard Shortcut (Dev Mode Only)**
- Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)
- This only works in development mode
- Instant reset with no confirmation dialog
- Great for rapid testing

## What Gets Reset

When you reset, all of the following are cleared:
- ✅ Current phase (back to evaluation)
- ✅ All agreed quotes
- ✅ All disagreed quotes  
- ✅ Ranked quotes
- ✅ Candidate matches
- ✅ localStorage persistence

## Testing the Ranking Phase

1. **Start fresh**: Click Reset or use the keyboard shortcut
2. **Evaluate quotes**: Swipe/click through the evaluation phase
3. **Agree with multiple quotes**: Select 3-5 quotes you agree with
4. **Continue to ranking**: You'll automatically advance
5. **Test the drag-and-drop**: 
   - Drag a quote from bottom to top
   - Watch all other cards slide down in real-time
   - Notice the dashed blue ring around the placeholder
   - See rank numbers update instantly
   - Drop to lock in the new order

## Quick Test Checklist

- [ ] Reset works (UI button)
- [ ] Reset works (keyboard shortcut)
- [ ] Drag from top to bottom - cards slide down
- [ ] Drag from bottom to top - cards slide up
- [ ] Drag to middle position - cards part smoothly
- [ ] Rank badges update in real-time
- [ ] Colors change based on new positions
- [ ] Dashed ring shows placeholder
- [ ] Smooth animations throughout

## Troubleshooting

**If the app still shows old data after reset:**
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find "Local Storage"
4. Manually clear `readrank-storage`
5. Refresh the page

**If keyboard shortcut doesn't work:**
- Make sure you're in development mode (`npm run dev`)
- Check the browser console for the "🔄 Dev shortcut: Resetting app..." message
- The shortcut only works in dev mode, not in production builds
