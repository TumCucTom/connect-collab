import { PrismaClient, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/utils';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { groupName, memberName } = await request.json();

    if (!groupName || !memberName) {
      return NextResponse.json(
        { error: 'Group name and member name are required' },
        { status: 400 }
      );
    }

    const code = generateCode();

    // Create the group and member in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const group = await tx.group.create({
        data: {
          name: groupName,
          code,
        },
      });

      const member = await tx.member.create({
        data: {
          name: memberName,
          groupId: group.id,
        },
      });

      return { group, member };
    });

    // Create response with cookie
    const response = NextResponse.json({ 
      groupId: result.group.id, 
      code: result.group.code 
    });

    // Set the memberId cookie
    response.cookies.set({
      name: 'memberId',
      value: result.member.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
} 