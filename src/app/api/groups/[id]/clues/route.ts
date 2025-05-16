import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function getCookieValue(cookieString: string | null, name: string): string | undefined {
  if (!cookieString) return undefined;
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get all clues for this group with author and solution information
    const clues = await prisma.clue.findMany({
      where: {
        groupId: id,
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
        solutions: {
          select: {
            correct: true,
            member: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(clues);
  } catch (error) {
    console.error('Failed to fetch clues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clues' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { text, answer } = await request.json();
    const cookieHeader = request.headers.get('cookie');
    const memberId = getCookieValue(cookieHeader, 'memberId');

    if (!text || !answer) {
      return NextResponse.json(
        { error: 'Clue text and answer are required' },
        { status: 400 }
      );
    }

    if (!memberId) {
      return NextResponse.json(
        { error: 'You must be a member to submit clues' },
        { status: 401 }
      );
    }

    // Create the clue
    const clue = await prisma.clue.create({
      data: {
        text,
        answer: answer.toUpperCase().trim(),
        groupId: id,
        authorId: memberId,
      },
    });

    // Return the created clue
    return NextResponse.json(clue);
  } catch (error) {
    console.error('Failed to create clue:', error);
    return NextResponse.json(
      { error: 'Failed to create clue' },
      { status: 500 }
    );
  }
} 