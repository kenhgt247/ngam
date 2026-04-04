import { Quote } from '../types';
import { quotes } from '../data/quotes';

export const getRandomQuote = (
  currentQuoteId?: string,
  categoryFilter?: string,
  moodFilter?: string
): Quote => {
  let filteredQuotes = quotes;

  if (categoryFilter) {
    filteredQuotes = filteredQuotes.filter(q => q.category === categoryFilter);
  }

  if (moodFilter) {
    filteredQuotes = filteredQuotes.filter(q => q.mood === moodFilter);
  }

  // Fallback to all quotes if filter results in empty array
  if (filteredQuotes.length === 0) {
    filteredQuotes = quotes;
  }

  // Filter out current quote if there are other options
  const availableQuotes = filteredQuotes.length > 1 
    ? filteredQuotes.filter(q => q.id !== currentQuoteId)
    : filteredQuotes;

  const randomIndex = Math.floor(Math.random() * availableQuotes.length);
  return availableQuotes[randomIndex];
};
