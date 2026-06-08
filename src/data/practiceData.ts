import type { BlindQuote } from '../store/useReadRankStore';

export const PRACTICE_TOPIC_KEY = 'practice-pizza';

export const PRACTICE_ISSUE = {
  id: 'practice-pizza',
  title: 'The Great Pizza Debate',
  question: 'Where do you stand on pizza toppings?',
};

export const PRACTICE_CHARACTERS = [
  { id: 'chef-mario', name: 'Chef Mario', title: 'Head Chef, Napoli Kitchen', avatar: { emoji: '👨‍🍳', bg: '#fef3c7' } },
  { id: 'pizza-pete', name: 'Pizza Pete', title: 'Professional Pizza Critic', avatar: { emoji: '🧐', bg: '#dbeafe' } },
  { id: 'tina-toppings', name: 'Tina Toppings', title: 'Pizza Purist', avatar: { emoji: '🤌', bg: '#fce7f3' } },
  { id: 'derek-deep', name: 'Derek Deep-Dish', title: 'Deep Dish Defender', avatar: { emoji: '💪', bg: '#dcfce7' } },
  { id: 'sam-slice', name: 'Sam Slice', title: 'Artisan Slice Enthusiast', avatar: { emoji: '🎨', bg: '#f3e8ff' } },
];

export const PRACTICE_QUOTES: BlindQuote[] = [
  { id: 'pq-1', text: 'Pineapple belongs on pizza and I will die on this hill.', candidateToken: 'chef-mario', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-2', text: 'The only acceptable pizza toppings are pepperoni, mozzarella, and silence.', candidateToken: 'tina-toppings', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-3', text: 'Ranch dressing is a perfectly valid pizza sauce. The haters are wrong.', candidateToken: 'pizza-pete', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-4', text: 'Thin crust is a crime against pizza. Deep dish is the only honest pizza.', candidateToken: 'derek-deep', topicKey: PRACTICE_TOPIC_KEY },
  { id: 'pq-5', text: 'Anchovies on pizza is an acquired taste worth acquiring. The ocean deserves representation.', candidateToken: 'sam-slice', topicKey: PRACTICE_TOPIC_KEY },
];
