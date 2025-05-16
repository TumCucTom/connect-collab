import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export function formatAnswerLength(answer: string): string {
  if (!answer) return '';
  
  // Split the answer by spaces and get the length of each part
  const parts = answer.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Single word
    return `(${answer.length})`;
  } else {
    // Multiple words
    const lengths = parts.map(part => part.length);
    return `(${lengths.join(',')})`;
  }
}

// Function to get color class based on category color
export function getCategoryColorClass(color: string): string {
  switch (color.toLowerCase()) {
    case 'yellow':
      return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    case 'green':
      return 'bg-green-200 border-green-400 text-green-800';
    case 'blue':
      return 'bg-blue-200 border-blue-400 text-blue-800';
    case 'purple':
      return 'bg-purple-200 border-purple-400 text-purple-800';
    default:
      return 'bg-gray-200 border-gray-400 text-gray-800';
  }
}

// Function to get difficulty color class
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-yellow-600';
    case 'medium':
      return 'text-green-600';
    case 'hard':
      return 'text-blue-600';
    case 'very hard':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

// Calculate score based on incorrect guesses
export function calculateScore(completed: boolean, incorrectGuesses: number): number {
  if (!completed) return 0;
  
  // Base score of 100 for solving, minus 10 for each incorrect guess
  const score = Math.max(100 - (incorrectGuesses * 10), 10); // Minimum score of 10
  return score;
} 