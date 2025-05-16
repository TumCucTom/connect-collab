import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function getCookieValue(cookieString: string | null, name: string): string | undefined {
  if (!cookieString) return undefined;
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

// This function handles the word classification for a clue
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get('cookie');
    const memberId = getCookieValue(cookieHeader, 'memberId');
    
    if (!memberId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { clueId, wordData } = await request.json();
    
    if (!clueId || !wordData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Verify the clue exists and belongs to this member
    const clue = await prisma.clue.findFirst({
      where: {
        id: clueId,
        authorId: memberId,
        groupId: id
      }
    });

    if (!clue) {
      return NextResponse.json(
        { error: 'Clue not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Update the clue with word data
    const updatedClue = await prisma.clue.update({
      where: {
        id: clueId
      },
      data: {
        wordData
      }
    });

    return NextResponse.json(updatedClue);
  } catch (error) {
    console.error('Failed to classify clue words:', error);
    return NextResponse.json(
      { error: 'Failed to classify clue words' },
      { status: 500 }
    );
  }
} 