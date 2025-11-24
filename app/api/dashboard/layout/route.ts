import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Load dashboard layout
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { dashboardLayout: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse the JSON string or return null
    const layout = user.dashboardLayout ? JSON.parse(user.dashboardLayout) : null;

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Error loading dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard layout' },
      { status: 500 }
    );
  }
}

// POST - Save dashboard layout
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { layout } = body;

    if (!layout) {
      return NextResponse.json({ error: 'Layout data is required' }, { status: 400 });
    }

    // Update user's dashboard layout
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        dashboardLayout: JSON.stringify(layout)
      }
    });

    return NextResponse.json({ success: true, message: 'Dashboard layout saved' });
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard layout' },
      { status: 500 }
    );
  }
}
