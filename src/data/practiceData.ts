import type { BlindQuote } from '../store/useReadRankStore';

export const PRACTICE_TOPIC_KEY = 'practice-pizza';

export const PRACTICE_ISSUE = {
  id: 'practice-pizza',
  title: 'The Great Pizza Debate',
  question: 'How should we settle the group pizza order?',
};

export const PRACTICE_CHARACTERS = [
  { id: 'chef-mario', name: 'Chef Mario', title: 'Head Chef, Napoli Kitchen', avatar: { emoji: '👨‍🍳', bg: '#fef3c7' } },
  { id: 'pizza-pete', name: 'Pizza Pete', title: 'Professional Pizza Critic', avatar: { emoji: '🧐', bg: '#dbeafe' } },
  { id: 'tina-toppings', name: 'Tina Toppings', title: 'Pizza Purist', avatar: { emoji: '🤌', bg: '#fce7f3' } },
  { id: 'derek-deep', name: 'Derek Deep-Dish', title: 'Deep Dish Defender', avatar: { emoji: '💪', bg: '#dcfce7' } },
  { id: 'sam-slice', name: 'Sam Slice', title: 'Artisan Slice Enthusiast', avatar: { emoji: '🎨', bg: '#f3e8ff' } },
];

// Blind, forward-looking positions — each answers the question with an approach
// and brief reasoning (the current Read & Rank quote shape), not a bare taste.
export const PRACTICE_QUOTES: BlindQuote[] = [
  { id: 'pq-1', text: 'Start from one cheese and one pepperoni that nobody vetoes, then spend the rest of the budget on whatever the table will actually finish.', candidateToken: 'tina-toppings', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-2', text: "Build it by the third — let each person design their own section so nobody pays for toppings they'd never touch.", candidateToken: 'sam-slice', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-3', text: 'Poll everyone first, rank the top three toppings, and order in that order until the money runs out. Deciding beats arguing.', candidateToken: 'pizza-pete', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-4', text: 'For a group this size, two large pies split half-and-half across the common toppings — broad coverage matters more than any one perfect slice.', candidateToken: 'derek-deep', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-5', text: 'Set a per-person budget and let the hungriest person place the order — they have the most at stake in getting it right.', candidateToken: 'chef-mario', topicKey: PRACTICE_TOPIC_KEY },
];
