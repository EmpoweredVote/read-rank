# Read & Rank Prototype

A React-based prototype for the Read & Rank feature, which allows users to evaluate candidate responses anonymously and rank them based on alignment with their views.

## Overview

This prototype implements a four-phase user experience:

1. **Quote Evaluation** - Users swipe through candidate responses (agree/disagree)
2. **Collection View** - Review all agreed-upon quotes
3. **Ranking Interface** - Drag and drop to rank quotes by priority
4. **Results Reveal** - View candidate matches with alignment percentages

## Features

### ✨ Core Functionality
- **Anonymous Evaluation**: Candidate responses shown without names, parties, or photos
- **Swipe Gestures**: Intuitive swipe left (disagree) / swipe right (agree) interface
- **Drag & Drop Ranking**: Tactile ranking interface with visual feedback
- **Candidate Matching**: Algorithm calculates alignment percentages
- **Results Visualization**: Beautiful results table with gradient backgrounds
- **Responsive Design**: Works on mobile, tablet, and desktop

### 🎨 Design System
- **EV Color Palette**: Implements the exact Empowered Vote color scheme
- **Manrope Typography**: Clean, modern font throughout
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation

### 📱 User Experience
- **Progressive Enhancement**: Works without JavaScript (basic functionality)
- **Touch Optimized**: Large touch targets and haptic feedback simulation
- **Keyboard Accessible**: Full navigation without mouse
- **Reduced Motion Support**: Respects user motion preferences

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom EV design system
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **State Management**: Zustand with persistence
- **Gestures**: @use-gesture/react
- **Build Tool**: Vite
- **Package Manager**: npm

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd readrank-prototype
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Project Structure

```
src/
├── components/           # React components
│   ├── EvaluationPhase.tsx    # Quote evaluation with swipe
│   ├── CollectionPhase.tsx    # Review agreed quotes
│   ├── RankingPhase.tsx       # Drag & drop ranking
│   ├── ResultsPhase.tsx       # Results reveal
│   ├── QuoteCard.tsx          # Swipeable quote component
│   ├── SwipeInstructions.tsx  # Gesture instructions
│   ├── PhaseNavigation.tsx    # Navigation footer
│   ├── PhaseContainer.tsx     # Phase router
│   └── ProgressHeader.tsx     # Progress indicator
├── store/               # State management
│   └── useReadRankStore.ts    # Zustand store
├── data/               # Mock data
│   └── mockData.ts          # Sample quotes and candidates
├── utils/              # Utilities
│   └── matchingAlgorithm.ts  # Candidate alignment algorithm
├── styles/             # Global styles
│   └── index.css           # Tailwind + custom styles
└── App.tsx             # Main application
```

## Key Components

### QuoteCard
Swipeable card component with gesture detection:
- Drag threshold: 120px
- Rotation: ±15 degrees
- Visual feedback during drag
- Accessibility: Screen reader friendly

### RankingPhase
Drag & drop interface using @dnd-kit:
- Sortable quote cards
- Visual drop zones
- Keyboard navigation support
- Touch optimized for mobile

### ResultsPhase
Results visualization with:
- Animated alignment gauges
- Gradient backgrounds by rank
- Staggered entrance animations
- Responsive table layout

## State Management

Uses Zustand for lightweight state management:

```typescript
interface ReadRankState {
  phase: 'evaluation' | 'collection' | 'ranking' | 'results';
  quotesToEvaluate: Quote[];
  agreedQuotes: Quote[];
  rankedQuotes: RankedQuote[];
  candidateMatches: MatchingResult[];
}
```

## Matching Algorithm

The alignment algorithm:
1. Assigns points to user rankings (1st=5pts, 2nd=4pts, etc.)
2. Calculates candidate alignment percentage
3. Sorts candidates by alignment score
4. Provides detailed breakdown per issue

## Design System

### Colors
- **Primary Text**: `#1c1c1c` (Black)
- **Background**: `#ffffff` (White) 
- **Primary Action**: `#ff5740` (Coral)
- **Quote Cards**: `#00657c` (Muted Blue)
- **Results Gradient**: Coral to Yellow gradients
- **Accent**: `#59b0c4` (Light Blue)

### Typography
- **Font Family**: Manrope (all weights)
- **Headings**: Bold, 28-32px
- **Body Text**: Medium, 16-18px
- **Instructions**: SemiBold, 18-22px
- **Buttons**: Bold, 16px

### Spacing
- **Mobile-first** approach
- **Max-width**: 1200px centered
- **Card padding**: 24px internal
- **Vertical spacing**: 32px between sections
- **Button padding**: 14px vertical, 32px horizontal

## Accessibility Features

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio
- **Touch Targets**: 44x44px minimum
- **Focus Indicators**: 3px coral outline
- **Screen Readers**: Semantic HTML + ARIA labels

### Keyboard Navigation
- **Tab Order**: Logical flow through interface
- **Arrow Keys**: Navigate within ranking interface
- **Enter/Space**: Activate buttons and drag operations
- **Escape**: Cancel operations and close modals

### Motion Preferences
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Alternative Animations**: Fade transitions for sensitive users
- **Performance**: GPU-accelerated transforms only

## Performance Optimizations

### Bundle Size
- **Target**: <250KB gzipped initial load
- **Code Splitting**: Route-based splitting by phase
- **Tree Shaking**: Removes unused Framer Motion features

### Animation Performance
- **Transform Only**: GPU-accelerated properties
- **RequestAnimationFrame**: Smooth gesture tracking
- **Debounced Events**: 16ms threshold for scroll events

## Mock Data

The prototype includes realistic mock data:
- **5 Foreign Aid quotes** from different candidates
- **6 Candidate profiles** with photos and parties
- **Alignment scores** calculated by matching algorithm

## Future Enhancements

### Phase 2 Features
- [ ] Multiple issue topics
- [ ] User authentication
- [ ] Real-time collaboration
- [ ] Social sharing features
- [ ] Detailed candidate profiles
- [ ] Analytics dashboard

### Technical Improvements
- [ ] Service Worker for offline support
- [ ] WebRTC for real-time features
- [ ] Progressive Web App capabilities
- [ ] Advanced analytics integration
- [ ] A/B testing framework

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Testing

### Manual Testing Checklist
- [ ] Complete evaluation flow (all agree)
- [ ] Complete evaluation flow (mixed responses)
- [ ] Complete evaluation flow (all disagree)
- [ ] Keyboard-only navigation
- [ ] Touch-only navigation on mobile
- [ ] Mouse-only navigation on desktop
- [ ] Page refresh during each phase
- [ ] Results modal functionality

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Empowered Vote** for the original concept and design
- **Framer Motion** for excellent animation library
- **Tailwind CSS** for utility-first styling
- **@dnd-kit** for accessible drag-and-drop
- **Manrope Font** by Mikhail Sharanda
