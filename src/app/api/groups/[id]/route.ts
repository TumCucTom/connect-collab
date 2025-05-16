import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/groups/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Find the group
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
} 