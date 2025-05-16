import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { calculateScore } from '@/lib/utils';

// POST /api/groups/[id]/puzzles/[puzzleId]/solve
export async function POST(
  request: Request,
  { params }: { params: { id: string; puzzleId: string } }
) {
  try {
    const memberIdCookie = cookies().get('memberId')?.value;
    
    if (!memberIdCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check member belongs to this group
    const member = await prisma.member.findFirst({
      where: {
        id: memberIdCookie,
        groupId: params.id
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not authorized to access this group' },
        { status: 403 }
      );
    }

    // Check puzzle exists and belongs to this group
    const puzzle = await prisma.puzzle.findFirst({
      where: {
        id: params.puzzleId,
        groupId: params.id
      }
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Get request data
    const { incorrectGuesses } = await request.json();
    
    // Calculate score based on incorrect guesses
    const score = calculateScore(true, incorrectGuesses);

    // Create or update attempt in a transaction and update member score
    const result = await prisma.$transaction(async (tx) => {
      // Check if attempt already exists
      const existingAttempt = await tx.attempt.findFirst({
        where: {
          memberId: memberIdCookie,
          puzzleId: params.puzzleId
        }
      });

      let attemptId;
      
      if (existingAttempt) {
        // Only update if not already completed
        if (!existingAttempt.completed) {
          const updated = await tx.attempt.update({
            where: { id: existingAttempt.id },
            data: {
              completed: true,
              incorrectGuesses,
              score,
              completedAt: new Date()
            }
          });
          attemptId = updated.id;
          
          // Update member score only if this is the first time completing
          await tx.member.update({
            where: { id: memberIdCookie },
            data: {
              score: {
                increment: score
              }
            }
          });
        } else {
          // Already completed, don't update score
          attemptId = existingAttempt.id;
        }
      } else {
        // Create new attempt
        const newAttempt = await tx.attempt.create({
          data: {
            memberId: memberIdCookie,
            puzzleId: params.puzzleId,
            completed: true,
            incorrectGuesses,
            score,
            completedAt: new Date()
          }
        });
        attemptId = newAttempt.id;
        
        // Update member score
        await tx.member.update({
          where: { id: memberIdCookie },
          data: {
            score: {
              increment: score
            }
          }
        });
      }
      
      return { attemptId, score };
    });

    return NextResponse.json({
      score: result.score,
      message: 'Solution recorded successfully'
    });
  } catch (error) {
    console.error('Error solving puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to record solution' },
      { status: 500 }
    );
  }
} 