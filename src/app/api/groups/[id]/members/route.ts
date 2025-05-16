import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// GET /api/groups/[id]/members
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

    // Get all members for this group
    const members = await prisma.member.findMany({
      where: { groupId: params.id },
      select: {
        id: true,
        name: true,
        score: true
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
} 