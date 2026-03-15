import type { Quote } from '../store/useReadRankStore';

export const PRACTICE_ISSUE = {
  id: 'practice-pizza',
  title: 'The Great Pizza Debate',
  question: 'Where do you stand on pizza toppings?',
};

export const PRACTICE_CHARACTERS = [
  { id: 'chef-mario', name: 'Chef Mario', title: 'Head Chef, Napoli Kitchen' },
  { id: 'pizza-pete', name: 'Pizza Pete', title: 'Professional Pizza Critic' },
  { id: 'tina-toppings', name: 'Tina Toppings', title: 'Pizza Purist' },
  { id: 'derek-deep', name: 'Derek Deep-Dish', title: 'Deep Dish Defender' },
  { id: 'sam-slice', name: 'Sam Slice', title: 'Artisan Slice Enthusiast' },
];

export const PRACTICE_QUOTES: Quote[] = [
  { id: 'pq-1', text: 'Pineapple belongs on pizza and I will die on this hill.', candidateId: 'chef-mario', issue: 'practice-pizza' },
  { id: 'pq-2', text: 'The only acceptable pizza toppings are pepperoni, mozzarella, and silence.', candidateId: 'tina-toppings', issue: 'practice-pizza' },
  { id: 'pq-3', text: 'Ranch dressing is a perfectly valid pizza sauce. The haters are wrong.', candidateId: 'pizza-pete', issue: 'practice-pizza' },
  { id: 'pq-4', text: 'Thin crust is a crime against pizza. Deep dish is the only honest pizza.', candidateId: 'derek-deep', issue: 'practice-pizza' },
  { id: 'pq-5', text: 'Anchovies on pizza is an acquired taste worth acquiring. The ocean deserves representation.', candidateId: 'sam-slice', issue: 'practice-pizza' },
];
