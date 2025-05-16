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

// Calculate score based on correct answer and hints/incorrect guesses
export function calculateScore(correct: boolean, hintsUsed: number): number {
  if (!correct) return 0;
  
  // Base score of 10 for correct answer, minus 1 for each hint used or incorrect guess
  // hintsUsed parameter includes both actual hints and incorrect guesses
  const score = Math.max(10 - hintsUsed, 1); // Minimum score of 1
  return score;
} 