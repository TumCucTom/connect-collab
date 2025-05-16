import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// GET /api/groups/[id]/puzzles
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    // Get all puzzles for this group with their categories and words
    const puzzles = await prisma.puzzle.findMany({
      where: { groupId: params.id },
      include: {
        author: {
          select: { name: true }
        },
        categories: {
          include: {
            words: true
          }
        },
        attempts: {
          select: {
            completed: true,
            member: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(puzzles);
  } catch (error) {
    console.error('Error fetching puzzles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/puzzles
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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
        { error: 'Not authorized to create puzzle in this group' },
        { status: 403 }
      );
    }

    const { difficulty, categories } = await request.json();

    // Validate data
    if (!difficulty || !categories || !Array.isArray(categories) || categories.length !== 4) {
      return NextResponse.json(
        { error: 'Invalid puzzle data. Must include difficulty and 4 categories.' },
        { status: 400 }
      );
    }

    // Validate each category has a name and 4 words
    for (const category of categories) {
      if (!category.name || !category.color || !category.words || 
          !Array.isArray(category.words) || category.words.length !== 4 ||
          category.words.some((word: string) => !word.trim())) {
        return NextResponse.json(
          { error: 'Each category must have a name, color, and 4 non-empty words' },
          { status: 400 }
        );
      }
    }

    // Create the puzzle with categories and words in a transaction
    const puzzle = await prisma.$transaction(async (tx) => {
      // Create the puzzle
      const newPuzzle = await tx.puzzle.create({
        data: {
          authorId: memberIdCookie,
          groupId: params.id,
          difficulty
        }
      });

      // Create categories and words
      for (const category of categories) {
        const newCategory = await tx.category.create({
          data: {
            name: category.name,
            color: category.color,
            puzzleId: newPuzzle.id,
            words: {
              create: category.words.map((word: string) => ({
                text: word.trim()
              }))
            }
          }
        });
      }

      return newPuzzle;
    });

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error('Error creating puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to create puzzle' },
      { status: 500 }
    );
  }
} 