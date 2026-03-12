# Read & Rank Prototype Development Plan

## Executive Summary
This plan outlines the development of a fully functional Read & Rank prototype that replicates the exact visual language and interaction patterns shown in the provided screenshots. The prototype will implement a four-phase user flow: Quote Evaluation → Collection View → Ranking Interface → Results Reveal, with strict adherence to the Empowered Vote Style Guide specifications.

## Visual Design System

### Color Palette Implementation
- **Primary Text**: Black (#1c1c1c) for headers and body text
- **Background**: White (#ffffff) for main canvas
- **Primary Action**: Coral (#ff5740) for instructional text and CTAs
- **Quote Cards**: Muted blue (#00657c) for all candidate response cards
- **Results Gradient**: Coral (#ff5740) for top matches, transitioning to Yellow (#fed12e) for lower alignment scores
- **Accent Elements**: Light blue (#59b0c4) for progress indicators and secondary UI elements

### Typography System
- **Font Family**: Manrope (all weights)
- **Issue Header**: Manrope Bold, 28-32px, #1c1c1c
- **Question Text**: Manrope SemiBold, 20-24px, #ff5740
- **Quote Text**: Manrope Medium, 16-18px, #ffffff (on muted blue cards)
- **Instructions**: Manrope SemiBold, 18-22px, #ff5740
- **Button Labels**: Manrope Bold, 16px, #ffffff
- **Results Table**: Manrope SemiBold for headers, Manrope Regular for body

### Layout Grid & Spacing
- **Mobile-first approach** with desktop adaptation
- **Content max-width**: 1200px centered
- **Card padding**: 24px internal
- **Vertical spacing**: 32px between major sections, 16px between related elements
- **Button padding**: 14px vertical, 32px horizontal
- **Card corner radius**: 12px
- **Button corner radius**: 8px

## Phase 1: Quote Evaluation (Swipe Interface)

### Screen Structure

**Header Section**
- Issue title in Manrope Bold, 28px, #1c1c1c
- Question text in Manrope SemiBold, 20px, #ff5740
- Consistent 24px top padding, 16px between title and question

**Interaction Zone** (Images 1-3)
- Central card display area occupying 60% of viewport height
- Cards appear in muted blue (#00657c) with 12px border-radius
- Quote label "Quote N" in Manrope Bold, 18px at card top
- Quote text in Manrope Medium, 16px, left-aligned with 24px internal padding
- White text (#ffffff) for all card content

**Swipe Instructions**
- Left instruction: "Swipe left if you disagree" with arrow pointing to card
- Right instruction: "Swipe right if you agree" with arrow pointing away from card
- Manrope Medium, 16px, #1c1c1c
- Positioned 40px from card edges

**Footer Navigation**
- Back button (outlined, coral border) bottom-left: 56px from bottom
- "Topic Completed 1" centered: Manrope SemiBold, 18px
- Continue button (solid coral fill) bottom-right: 56px from bottom
- All buttons 48px height minimum for touch targets

### Interaction Mechanics

**Card Stack System**
- Display one card at a time in focus position
- Subsequent cards scaled to 95% and positioned 8px below, creating depth
- Maximum 2 cards visible in stack preview
- Z-index layering: focused card (z-100), stack cards decrease by 10

**Swipe Gesture Implementation**
- **Threshold**: 120px horizontal drag or 40% card width (whichever is less)
- **Velocity factor**: Swipes over 800px/s trigger immediate action
- **Visual feedback during drag**:
  - Card rotates proportionally to drag distance (max ±15 degrees)
  - Card follows cursor/finger with slight elastic resistance
  - Opacity decreases as card moves (100% → 85% at threshold)
  - Reveal next card underneath by scaling it to 98%

**Swipe Right (Agree)**
- Card animates off-screen right with rotation
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1), 320ms duration
- Next card animates to focus position immediately
- Agreed quote added to collection (visible in Phase 2)

**Swipe Left (Disagree)**
- Card animates off-screen left with rotation
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1), 320ms duration
- Next card animates to focus position
- Quote removed from consideration

**Incomplete Swipe (Return Animation)**
- Card springs back to center position
- Spring physics: tension 280, friction 24
- Rotation resets to 0 degrees over 200ms

### State Management
```javascript
{
  currentQuoteIndex: 0,
  agreedQuotes: [],
  disagreedQuotes: [],
  allQuotes: [...], // Loaded from backend
  topicId: "foreign-aid",
  issueTitle: "Foreign Policy and National Security | Foreign Aid",
  questionText: "What priority should the U.S. give to distributing Foreign Aid, and for what purposes?"
}
```

## Phase 2: Collection View (Agreed Quotes Panel)

### Screen Structure (Images 4-5)

**Layout Transition**
- After final swipe, screen transitions to collection view
- Instructional text appears in coral (#ff5740), centered
- "All done! Now click on 'Continue' to move to the next step."
- Manrope SemiBold, 20px

**Quote Display (Right Panel)**
- All agreed-upon quotes displayed vertically stacked
- Each quote maintains muted blue card styling (#00657c)
- Cards are non-interactive at this stage
- Consistent spacing: 16px between cards
- Panel width: 55% of viewport on desktop, 100% on mobile

**Visual Hierarchy**
- Quotes appear in order they were agreed upon
- Each card height adjusts to content (min 120px)
- "Quote N" labels preserved from Phase 1
- Scrollable if quotes exceed viewport height

### Animation Sequence
1. Final evaluation card swipes off (320ms)
2. Instructional text fades in (240ms delay, 400ms fade)
3. Agreed quote cards slide in from right staggered (80ms delay between each)
4. Each card: translateX(100%) → translateX(0), 400ms, ease-out
5. Continue button pulses gently to draw attention (scale 1.0 ↔ 1.03, 1200ms loop)

## Phase 3: Ranking Interface

### Screen Structure (Image 5)

**Maintained Elements**
- Issue header and question remain at top
- Instructional text updates: "All done! Now click on 'Continue' to move to the next step."
- Footer navigation persists

**Ranking Panel**
- Quotes displayed in vertical list, right-aligned on desktop
- Each card shows drag handle indicator (6 horizontal dots, left side)
- Cards maintain muted blue (#00657c) styling
- Visual numbering removed until user interaction begins

### Drag-and-Drop Mechanics

**Interaction States**

*Default State*
- Cards show subtle hover effect: scale(1.02), shadow increase
- Cursor changes to grab icon on hover
- Transition: 180ms ease-out

*Dragging State*
- Active card: scale(1.05), strong shadow (0 8px 24px rgba(0,0,0,0.15))
- Cursor changes to grabbing icon
- Card z-index increases to 200
- Slight rotation (2 degrees) for tactile feel
- Other cards remain in position with gap where dragged card originated

*Drop Zones*
- As dragged card moves, other cards animate to show insertion point
- Gap expands (180ms spring animation) where card will be inserted
- Placeholder appears as dashed outline in muted blue
- Cards above/below shift with 240ms ease-in-out timing

*Drop Completion*
- Card animates to final position (320ms ease-out)
- All cards reflow with staggered animation (40ms delay cascade)
- Rank numbers fade in on left side of each card (200ms fade)
- Card scale returns to 1.0, shadow normalizes

**Touch Optimization (Mobile)**
- Long-press activation (280ms hold) triggers drag mode
- Haptic feedback on drag start (if available)
- Dragged card follows touch with 20px offset above finger
- Auto-scroll when dragging near viewport edges (2px per 16ms)
- Drop occurs on touch release

**Keyboard Accessibility**
- Tab navigation between cards
- Space/Enter to "pick up" card
- Arrow keys to move position
- Space/Enter to "drop" card
- Visual focus indicator: 3px coral outline

### Ranking Algorithm & Data Structure
```javascript
{
  rankedQuotes: [
    {
      quoteId: "q1",
      rank: 1,
      text: "...",
      candidateId: "candidate-x" // Hidden until reveal
    },
    // ... more quotes
  ]
}
```

**User Ranking Capture**
- Each position change captured with timestamp
- Final ranking order used for matching algorithm
- Top-ranked = highest weight in matching calculation

## Phase 4: Results Reveal Screen

### Screen Structure (Images 6-7)

**Header Section**
- "Results" title: Manrope Bold, 36px, #1c1c1c, centered
- Subheading: "Your anonymous rankings uncovered the best candidate fit for your views"
- Manrope Regular, 18px, #1c1c1c, centered
- 48px spacing below header section

**Results Table**

*Table Header (Fixed)*
- Background: White (#ffffff)
- Border: 2px solid coral (#ff5740)
- Columns: Rank | Candidate | Political Party | Alignment (in percent) | Issues Aligned | Details
- Manrope SemiBold, 14px, #1c1c1c
- 16px vertical padding, 20px horizontal padding

*Candidate Rows*
- **Gradient Background System**:
  - Top match (#1): Coral (#ff5740) to light coral gradient
  - Second match (#2): Coral to orange gradient
  - Mid-tier (#3): Orange to light orange gradient
  - Lower matches (#4-6): Yellow (#fed12e) gradient
  
- **Content Layout** (per row):
  - Rank: Manrope ExtraBold, 32px, white, 80px width
  - Candidate Photo: 64px circle, 8px from rank number
  - Candidate Name: Manrope Bold, 20px, white/dark (contrast-dependent)
  - Party Name: Manrope Regular, 16px, white/dark
  - Alignment Gauge: Circular progress indicator (see below)
  - Issues Count: Manrope Bold, 24px (e.g., "4/5")
  - View More Button: White background, coral text, 40px height

*Alignment Gauge*
- Circular progress ring (120px diameter)
- Background ring: rgba(255,255,255,0.3), 12px stroke
- Progress ring: #00657c (muted blue), 12px stroke
- Percentage text: Manrope ExtraBold, 28px, muted blue, centered
- Animates on reveal: 0% → final % over 800ms with ease-out

**Load More Functionality**
- Button appears after initial 6 candidates
- Coral background (#ff5740), white text
- Manrope Bold, 16px
- Loads additional candidates in batches of 3

### Reveal Animation Sequence

**Entrance Animation (1200ms total)**
1. Screen fades in from white (200ms)
2. Header text types in effect (400ms, 40ms per character group)
3. Table header slides down from top (300ms, ease-out)
4. Candidate rows cascade in from bottom:
   - Staggered delay: 120ms between rows
   - Each row: translateY(40px) & opacity 0 → translateY(0) & opacity 1
   - Duration per row: 400ms, ease-out

**Alignment Gauge Animation**
- Begins 200ms after row entrance completes
- Circular progress draws clockwise (800ms)
- Percentage counter animates: 0 → final value
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1)

### Detailed View Modal (Not shown but specified)

**Triggered by**: "View more →" button click

**Modal Structure**
- Full-screen overlay: rgba(0,0,0,0.6)
- Card: White, 90vw max-width, 90vh max-height, centered
- Close button: Top-right, 40x40px, coral (#ff5740)

**Content Sections**
1. **Header**: Candidate photo, name, party, overall alignment
2. **Issue-by-Issue Breakdown**:
   - Each ranked issue displayed as expandable accordion
   - Shows user's rank for that issue
   - Shows candidate's actual response
   - Displays alignment calculation for that issue
3. **Quote Comparison**: Side-by-side view of user's top-ranked quote vs. candidate's positions

## Responsive Breakpoints

### Mobile (320px - 767px)
- Single column layout throughout
- Quote cards: 92% viewport width
- Swipe threshold: 100px or 35% card width
- Larger touch targets: 56px minimum
- Results table converts to card layout:
  - Each candidate as individual card
  - Stacked vertically
  - Full information visible per card

### Tablet (768px - 1023px)
- Two-column layout in collection/ranking phases
- Instructions left (40%), quotes right (55%)
- Quote cards: 520px max-width
- Results table scrolls horizontally if needed
- Touch and mouse interactions both supported

### Desktop (1024px+)
- Optimal layout as shown in screenshots
- Quote cards: 600px max-width, centered
- Results table: full-width with fixed column sizing
- Hover states more prominent
- Mouse-optimized drag interactions

## Data Flow Architecture

### Phase Flow State Machine
```javascript
{
  phase: 'evaluation' | 'collection' | 'ranking' | 'results',
  
  // Evaluation phase
  quotesToEvaluate: Quote[],
  currentQuoteIndex: number,
  
  // Collection phase  
  agreedQuotes: Quote[],
  
  // Ranking phase
  rankedQuotes: RankedQuote[],
  
  // Results phase
  candidateMatches: CandidateMatch[],
  matchingAlgorithmResults: AlgorithmOutput
}
```

### Matching Algorithm Specification

**Input Data**
- User's ranked quotes (ordered array, 1-N where 1 is highest)
- Candidate response database (all quotes mapped to candidates)
- Issue weighting from Compass (if available)

**Calculation Method**
1. Assign point values to user rankings:
   - Rank 1: 5 points
   - Rank 2: 4 points
   - Rank 3: 3 points
   - Rank 4: 2 points
   - Rank 5: 1 point

2. For each candidate, sum points where their quote was ranked

3. Calculate alignment percentage:
   ```
   (Candidate Points / Maximum Possible Points) × 100
   ```

4. Calculate "Issues Aligned" count:
   - Count how many of user's ranked quotes belong to that candidate

5. Sort candidates by alignment percentage (descending)

**Output Format**
```javascript
{
  candidateId: "...",
  name: "...",
  party: "...",
  photo: "...",
  alignmentPercent: 90,
  issuesAligned: 4,
  totalIssues: 5,
  rankedQuoteMatches: [
    { userRank: 1, quoteId: "...", points: 5 },
    // ...
  ]
}
```

## Technical Implementation Stack

### Frontend Framework
- **React 18** with TypeScript
- **Framer Motion** for animations
- **React DnD** or **dnd-kit** for drag-and-drop
- **Tailwind CSS** for utility styling (configured with EV colors)

### State Management
- **Zustand** or **React Context** for phase flow
- Local storage for draft state persistence
- Session recovery on page reload

### Gesture Detection
- **React UseGesture** for swipe mechanics
- Custom hooks for drag-and-drop with accessibility
- Touch event optimization for mobile

### Data Fetching
- Mock API responses for prototype
- JSON structure matching backend schema
- Simulated loading states (400ms delay)

## Component Architecture

```
<ReadAndRankApp>
  ├── <ProgressHeader>
  ├── <PhaseContainer>
  │   ├── <EvaluationPhase>
  │   │   ├── <IssueHeader>
  │   │   ├── <QuoteCard> (swipeable)
  │   │   ├── <SwipeInstructions>
  │   │   └── <PhaseNavigation>
  │   ├── <CollectionPhase>
  │   │   ├── <IssueHeader>
  │   │   ├── <InstructionalText>
  │   │   ├── <AgreedQuotesList>
  │   │   └── <PhaseNavigation>
  │   ├── <RankingPhase>
  │   │   ├── <IssueHeader>
  │   │   ├── <InstructionalText>
  │   │   ├── <DraggableQuoteList>
  │   │   │   └── <DraggableQuoteCard>[]
  │   │   └── <PhaseNavigation>
  │   └── <ResultsPhase>
  │       ├── <ResultsHeader>
  │       ├── <ResultsTable>
  │       │   ├── <TableHeader>
  │       │   └── <CandidateRow>[]
  │       ├── <LoadMoreButton>
  │       └── <ShareOptions>
  └── <DetailModal> (conditional)
```

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- Color contrast ratios: minimum 4.5:1 for text
- All interactive elements: minimum 44x44px touch targets (mobile)
- Focus indicators: 3px solid coral outline with 2px offset
- Skip navigation links for keyboard users

### Screen Reader Support
- Semantic HTML throughout (main, nav, article, section)
- ARIA labels for swipe actions: "Swipe right to agree with quote 1"
- ARIA live regions announce phase transitions
- Table properly structured with thead, tbody, scope attributes
- Announced alignment percentages: "90 percent aligned"

### Keyboard Navigation
- Tab order: logical, follows visual flow
- Escape key: dismisses modals, cancels drags
- Enter/Space: activates buttons, selects quotes
- Arrow keys: navigation within ranking interface
- Focus trap in modals

### Motion Preferences
- Respect `prefers-reduced-motion` media query
- Reduced motion mode: remove swipe animations, use fade transitions
- Disable rotation effects
- Maintain functionality without animation

## Performance Optimization

### Image Optimization
- Candidate photos: 128x128px at 2x resolution (WebP format)
- Lazy loading for below-fold candidates
- Placeholder blur effect during load

### Animation Performance
- Use `transform` and `opacity` only (GPU-accelerated)
- `will-change` property on draggable elements
- Debounce scroll events (16ms threshold)
- RequestAnimationFrame for gesture tracking

### Bundle Size Targets
- Initial load: < 250KB gzipped
- Route-based code splitting by phase
- Lazy load Results phase components
- Tree-shake unused Framer Motion features

## Testing Strategy

### User Flow Testing
1. Complete evaluation with all agree swipes (3, 4, 5 quotes)
2. Complete evaluation with mix of agree/disagree
3. Complete evaluation with all disagree (edge case)
4. Ranking interaction with keyboard only
5. Ranking interaction with touch only
6. Ranking interaction with mouse only
7. View results and drill into details
8. Page refresh during each phase (state recovery)

### Interaction Testing
- Swipe threshold accuracy at various speeds
- Incomplete swipe return animation
- Rapid successive swipes
- Drag initiation on mobile (long-press)
- Drag across touch devices
- Drag with keyboard
- Simultaneous multi-touch (should ignore)

### Visual Regression Testing
- Screenshot comparison across breakpoints
- Color accuracy against style guide
- Typography rendering across browsers
- Animation frame-by-frame verification

### Accessibility Testing
- Automated: Axe DevTools, Lighthouse
- Manual: Screen reader walkthrough (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation completion
- High contrast mode compatibility

## Prototype Deployment

### Hosting Environment
- Vercel or Netlify for instant deployment
- Environment variables for API endpoints
- Preview deployments for each iteration

### Analytics Integration
- Event tracking for each phase transition
- Swipe direction distribution
- Average ranking adjustments per user
- Completion rate by phase
- Time spent per phase
- Device type distribution

### Feedback Collection
- Exit survey after results phase
- "Report issue" button in footer
- Session recording with Hotjar or similar
- A/B testing framework for UI variations

## Development Timeline

### Phase 1: Foundation
- Project setup, tooling configuration
- Design system implementation (colors, typography, spacing)
- Base component library
- Quote card component with styling

### Phase 2: Evaluation Interface
- Swipe gesture implementation
- Card stack animation
- State management for evaluations
- Responsive layout

### Phase 3: Collection & Ranking
- Collection view transitions
- Drag-and-drop implementation
- Ranking algorithm
- Keyboard accessibility

### Phase 4: Results & Polish
- Results table with animations
- Matching algorithm integration
- Detail modal
- Cross-browser testing

### Phase 5: Testing & Iteration
- User testing sessions
- Accessibility audit
- Performance optimization
- Bug fixes and refinement

## Success Metrics

### Completion Rate Targets
- Evaluation phase: >85% completion
- Ranking phase: >75% completion  
- Full flow: >65% completion

### Engagement Metrics
- Average time per phase: 45-90 seconds
- Ranking adjustments: 2-4 per user
- Detail view exploration: >40% click-through

### Technical Metrics
- Lighthouse Performance score: >90
- First Contentful Paint: <1.5s
- Time to Interactive: <3.0s
- Zero critical accessibility violations