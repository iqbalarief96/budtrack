import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateAIResponse } from '@/lib/ai';

// POST /api/voice-transcribe
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's settings
    const userSettings = await prisma.userSettings.findUnique({
      where: {
        userId: session.user.id
      }
    });

    if (!userSettings?.apiKey) {
      return NextResponse.json(
        { error: 'API key tidak ditemukan. Silakan atur API key di halaman Settings.' },
        { status: 400 }
      );
    }

    // Get the audio file and transcription from the request
    const formData = await request.formData();
    const transcription = formData.get('transcription') as string;
    
    // If no transcription is provided (client-side transcription failed)
    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription tidak ditemukan' },
        { status: 400 }
      );
    }

    // Fetch categories and wallets for the user
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { isDefault: true } // Default categories instead of system categories
        ]
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true
      }
    });

    // Create prompt for AI to extract transaction details
    const prompt = `
      Analisis transaksi keuangan dari kalimat berikut:
      "${transcription}"
      
      Kategori yang tersedia:
      ${categories.map(c => `- ${c.name} (${c.type})`).join('\n')}
      
      Dompet yang tersedia:
      ${wallets.map(w => `- ${w.name}`).join('\n')}
      
      Ekstrak detailnya dalam format JSON dengan struktur berikut:
      {
        "type": "INCOME" atau "EXPENSE",
        "amount": angka (tanpa mata uang atau tanda baca),
        "description": deskripsi transaksi,
        "categoryName": nama kategori (paling cocok dari daftar di atas),
        "walletName": nama dompet (paling cocok dari daftar di atas atau kosong jika tidak disebutkan),
        "date": tanggal dalam format "YYYY-MM-DD" (kosong jika tidak disebutkan, gunakan hari ini jika hanya menyebut "hari ini")
      }
      
      Contoh input:
      "Belanja di supermarket hari ini 150 ribu dari dompet utama"
      
      Contoh output:
      {
        "type": "EXPENSE",
        "amount": 150000,
        "description": "Belanja di supermarket",
        "categoryName": "Food",
        "walletName": "Utama",
        "date": "2023-07-26"
      }
      
      Hanya berikan JSON, tanpa penjelasan tambahan.
    `;

    // Call AI service with the provider and api key from user settings
    const response = await generateAIResponse({
      prompt,
      provider: userSettings.provider || 'openrouter',
      apiKey: userSettings.apiKey,
      model: userSettings.selectedModel || 'openai/gpt-3.5-turbo'
    });

    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Format respons AI tidak valid' },
        { status: 500 }
      );
    }

    // Parse the AI response
    const parsedData = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsedData.type || !parsedData.amount || !parsedData.description) {
      return NextResponse.json(
        { error: 'Informasi transaksi tidak lengkap, mohon berikan detil lebih jelas' },
        { status: 400 }
      );
    }

    // Find matching category ID from name
    let categoryId = undefined;
    if (parsedData.categoryName) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === parsedData.categoryName.toLowerCase() && 
             (c.type === parsedData.type || c.type === 'BOTH')
      );
      categoryId = matchedCategory?.id;
    }

    // Find matching wallet ID from name
    let walletId = undefined;
    if (parsedData.walletName) {
      const matchedWallet = wallets.find(
        w => w.name.toLowerCase() === parsedData.walletName.toLowerCase()
      );
      walletId = matchedWallet?.id;
    } else if (wallets.length > 0) {
      // Default to the first wallet if none specified
      walletId = wallets[0].id;
    }

    return NextResponse.json({
      success: true,
      transaction: {
        type: parsedData.type,
        amount: parsedData.amount,
        description: parsedData.description,
        categoryId,
        walletId,
        date: parsedData.date || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error processing voice transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 