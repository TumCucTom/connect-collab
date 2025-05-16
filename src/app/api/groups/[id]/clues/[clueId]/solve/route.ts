import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { calculateScore } from '@/lib/utils';

const prisma = new PrismaClient();

function getCookieValue(cookieString: string | null, name: string): string | undefined {
  if (!cookieString) return undefined;
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; clueId: string } }
) {
  try {
    // Explicitly destructure and validate params first
    const { id, clueId } = params;
    if (!id || !clueId) {
      return NextResponse.json(
        { error: 'Invalid route parameters' },
        { status: 400 }
      );
    }

    const { answer, hintsUsed = 0 } = await request.json();
    const cookieHeader = request.headers.get('cookie');
    const memberId = getCookieValue(cookieHeader, 'memberId');

    if (!answer || !memberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
    });

    if (!clue) {
      return NextResponse.json(
        { error: 'Clue not found' },
        { status: 404 }
      );
    }

    // Check if member has already solved this clue correctly
    const existingSolution = await prisma.solution.findFirst({
      where: {
        clueId,
        memberId,
        correct: true
      },
    });

    if (existingSolution) {
      return NextResponse.json(
        { error: 'You have already solved this clue' },
        { status: 400 }
      );
    }

    const isCorrect = answer.toUpperCase() === clue.answer.toUpperCase();

    // Create or update the solution
    let solution;
    
    const existingAttempt = await prisma.solution.findFirst({
      where: {
        clueId,
        memberId,
      },
    });
    
    if (existingAttempt) {
      // Update existing attempt if it exists
      solution = await prisma.solution.update({
        where: {
          id: existingAttempt.id
        },
        data: {
          answer: answer.toUpperCase(),
          correct: isCorrect,
          hintsUsed: hintsUsed,
        },
      });
    } else {
      // Create new solution if no attempts yet
      solution = await prisma.solution.create({
        data: {
          answer: answer.toUpperCase(),
          correct: isCorrect,
          hintsUsed: hintsUsed,
          memberId,
          clueId,
        },
      });
    }

    // If correct, update the member's score
    if (isCorrect) {
      // Calculate score based on hints used (which now includes incorrect guesses)
      const points = calculateScore(true, hintsUsed);
      
      await prisma.member.update({
        where: { id: memberId },
        data: {
          score: {
            increment: points,
          },
        },
      });
    }

    return NextResponse.json({
      correct: isCorrect,
      solution,
      pointsEarned: isCorrect ? calculateScore(true, hintsUsed) : 0
    });
  } catch (error) {
    console.error('Failed to submit solution:', error);
    return NextResponse.json(
      { error: 'Failed to submit solution' },
      { status: 500 }
    );
  }
} 