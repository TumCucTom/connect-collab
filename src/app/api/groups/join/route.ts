import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { code, memberName } = await request.json();

    if (!code || !memberName) {
      return NextResponse.json(
        { error: 'Code and member name are required' },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { code },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const member = await prisma.member.create({
      data: {
        name: memberName,
        groupId: group.id,
      },
    });

    // Create response with cookie
    const response = NextResponse.json({ groupId: group.id });

    // Set the memberId cookie
    response.cookies.set({
      name: 'memberId',
      value: member.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Failed to join group:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
} 