import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

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
    const { id, clueId } = params;
    if (!id || !clueId) {
      return NextResponse.json(
        { error: 'Invalid route parameters' },
        { status: 400 }
      );
    }

    const { hintType, revealedPositions = [] } = await request.json();
    const cookieHeader = request.headers.get('cookie');
    const memberId = getCookieValue(cookieHeader, 'memberId');

    if (!hintType || !memberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch the clue
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
    });

    if (!clue) {
      return NextResponse.json(
        { error: 'Clue not found' },
        { status: 404 }
      );
    }

    let hint = null;

    if (hintType === 'random_letter') {
      // Select a random letter from the answer that hasn't been revealed yet
      const answer = clue.answer.toUpperCase().replace(/\s+/g, '');
      
      // Get all possible positions (excluding spaces)
      const allPositions = [];
      let lettersProcessed = 0;
      
      for (let i = 0; i < clue.answer.length; i++) {
        if (clue.answer[i] !== ' ') {
          allPositions.push({
            position: i,
            letterIndex: lettersProcessed
          });
          lettersProcessed++;
        }
      }
      
      // Filter out already revealed positions
      const availablePositions = allPositions.filter(
        pos => !revealedPositions.includes(pos.position)
      );
      
      // If all positions are revealed, return error
      if (availablePositions.length === 0) {
        return NextResponse.json(
          { error: 'All letters have been revealed already' },
          { status: 400 }
        );
      }
      
      // Choose a random position from available ones
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const selectedPosition = availablePositions[randomIndex];
      
      // Get the letter at the selected position
      const letter = answer[selectedPosition.letterIndex];
      
      hint = {
        type: 'random_letter',
        letter,
        position: selectedPosition.position
      };
    } else if (['indicator', 'fodder', 'definition'].includes(hintType)) {
      // Ensure clue has word data
      if (!clue.wordData) {
        return NextResponse.json(
          { error: 'Clue does not have word classification data' },
          { status: 400 }
        );
      }
      
      // Return words of the requested type
      const wordData = clue.wordData as any; // TypeScript casting
      const words = Object.entries(wordData)
        .filter(([_, type]) => type === hintType)
        .map(([word]) => word);
      
      hint = {
        type: hintType,
        words
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid hint type' },
        { status: 400 }
      );
    }

    return NextResponse.json({ hint });
  } catch (error) {
    console.error('Failed to get hint:', error);
    return NextResponse.json(
      { error: 'Failed to get hint' },
      { status: 500 }
    );
  }
} 