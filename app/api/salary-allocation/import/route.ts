import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allocationSerializer } from '@/lib/allocation/allocation-serializer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { json } = await request.json();

    if (!json) {
      return NextResponse.json(
        { error: 'JSON data diperlukan' },
        { status: 400 }
      );
    }

    // Parse and validate JSON
    const parsed = allocationSerializer.deserialize(json);

    // Generate pretty print for preview
    const preview = allocationSerializer.prettyPrint(parsed);

    return NextResponse.json({
      data: parsed,
      preview,
    });
  } catch (error) {
    console.error('Error importing config:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengimpor konfigurasi';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
