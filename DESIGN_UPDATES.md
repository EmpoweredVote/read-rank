# Design Updates - Read & Rank Prototype

## Summary of Changes

I've updated the Read & Rank prototype to match your design screenshots more closely. Here are the key changes:

### 1. **CSS Styling (index.css)**
- Added `@layer components` with predefined CSS classes:
  - `.ev-quote-card` - Teal/muted-blue background (#00657c) for quote cards
  - `.ev-heading`, `.ev-text-primary`, `.ev-text-secondary` - Typography classes
  - `.ev-question`, `.ev-instruction` - Red/coral text for questions and instructions
  - `.ev-button-primary`, `.ev-button-secondary` - Styled buttons
  - `.ev-gradient-top-match`, `.ev-gradient-mid-match`, `.ev-gradient-low-match` - Orange gradient backgrounds for results

### 2. **Results Phase (ResultsPhase.tsx)**
- Changed from HTML table to div-based grid layout
- Implemented orange gradient rows matching your design:
  - Ranks #1-2: Bright orange (`from-orange-500 to-orange-400`)
  - Rank #3: Medium orange (`from-orange-400 to-orange-300`)
  - Rank #4+: Yellow (`from-yellow-300 to-yellow-200`)
- Added white border to candidate photos
- Improved responsive grid layout with proper spacing
- Changed "View More →" to "View more →" to match design

### 3. **Phase Navigation (PhaseNavigation.tsx)**
- Updated "Topic Completed" counter to display as:
  ```
  Topic Completed
        1
  ```
  (text on top, large number below)
- Matches the layout shown in screenshots

### 4. **Mock Data (mockData.ts)**
- Updated candidate names to match screenshot:
  - Donald Trump (Republican Party)
  - Timothy Peck (Democratic Party)
  - Erin Houchin (Republican Party)
  - Russell Brooksbank (Libertarian Party)
- Updated alignment percentages to match (90%, 90%, 50%, 25%)
- Updated quote text to be more concise and match the screenshots

## What You Should See

### Evaluation Phase
- Teal quote cards with white text
- Clear swipe instructions with arrows
- "Topic Completed" counter at bottom
- Back and Continue buttons

### Collection Phase  
- Orange instruction text: "All done! Now click on 'Continue' to move to the next step."
- Stacked teal quote cards showing your selections
- Left side: instructions and tips
- Right side: your selected quotes

### Ranking Phase
- Draggable teal quote cards
- Position indicators (#1, #2, #3, etc.) in white circles
- Smooth drag-and-drop animations

### Results Phase
- Bold "Results" heading
- Subtitle: "Your anonymous rankings uncovered the best candidate fit for your views"
- Table header with coral background
- Orange gradient rows for each candidate:
  - #1 Trump - Bright orange, 90% alignment
  - #2 Timothy Peck - Bright orange, 90% alignment  
  - #3 Erin Houchin - Medium orange, 50% alignment
  - #4+ Russell Brooksbank - Yellow, 25% alignment
- Circular alignment gauges with percentage
- "View more →" buttons

## To Run the Updated Prototype

```bash
cd /Users/chrisandrews/Documents/GitHub/EV-ReadRank/readrank-prototype
npm install  # if needed
npm run dev
```

## Design System Colors

- **EV Black**: `#1c1c1c`
- **EV White**: `#ffffff`  
- **EV Coral/Red**: `#ff5740` (questions, instructions, buttons)
- **EV Muted Blue/Teal**: `#00657c` (quote cards, primary actions)
- **EV Light Blue**: `#59b0c4` (accents)
- **Orange Gradients**: `orange-500 to orange-400` (top matches)
- **Yellow Gradients**: `yellow-300 to yellow-200` (lower matches)

## Notes

- All CSS classes now use the `@layer components` approach for better Tailwind integration
- The design follows the Empowered.Vote brand with Manrope font
- Mobile-responsive with proper spacing and touch targets
- Smooth animations using Framer Motion
- Accessibility considerations with proper ARIA labels
