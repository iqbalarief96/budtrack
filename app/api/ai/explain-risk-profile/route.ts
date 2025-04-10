import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/ai/explain-risk-profile
export async function POST(request: NextRequest) {
  try {
    // Periksa autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil data dari body
    const data = await request.json();
    const { profile } = data;
    
    // Validasi input
    if (!profile || !['Konservatif', 'Moderat', 'Agresif'].includes(profile)) {
      return NextResponse.json(
        { error: "Invalid risk profile. Must be 'Konservatif', 'Moderat', or 'Agresif'." }, 
        { status: 400 }
      );
    }

    // Ambil pengaturan AI dari database
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        provider: true,
        apiKey: true,
        selectedModel: true
      }
    });

    if (!userSettings?.provider || !userSettings?.apiKey || !userSettings?.selectedModel) {
      return NextResponse.json({ 
        error: "Pengaturan AI belum dikonfigurasi. Silakan atur di halaman Pengaturan." 
      }, { status: 400 });
    }

    // Buat prompt untuk AI
    const prompt = `Anda adalah penasihat keuangan AI yang berbahasa Indonesia. 
Pengguna ini diklasifikasikan sebagai investor ${profile} berdasarkan kuesioner penilaian risiko. 
Berikan penjelasan rinci (2-3 paragraf) tentang apa artinya profil ini, jenis investasi apa yang mungkin cocok, 
dan pertimbangan utama bagi mereka. Gunakan bahasa yang mudah dipahami.

Jawaban:`;

    let aiResponse;
    const { provider, apiKey, selectedModel } = userSettings;

    // Panggil API AI yang sesuai berdasarkan provider
    if (provider === 'openai') {
      aiResponse = await callOpenAI(prompt, apiKey, selectedModel);
    } else if (provider === 'deepseek') {
      aiResponse = await callDeepSeek(prompt, apiKey, selectedModel);
    } else if (provider === 'openrouter') {
      aiResponse = await callOpenRouter(prompt, apiKey, selectedModel);
    } else {
      return NextResponse.json({ 
        error: `Provider AI '${provider}' tidak didukung.` 
      }, { status: 400 });
    }

    if (!aiResponse) {
      throw new Error("Gagal mendapatkan respons dari AI");
    }

    return NextResponse.json({ 
      success: true, 
      explanation: aiResponse.trim() 
    });
  } catch (error: any) {
    console.error("Error getting AI explanation:", error);
    return NextResponse.json(
      { error: `Terjadi kesalahan saat mendapatkan penjelasan AI: ${error.message}` }, 
      { status: 500 }
    );
  }
}

// Fungsi untuk memanggil OpenAI API
async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }
    
    return data.choices[0]?.message?.content || 'No content generated';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// Fungsi untuk memanggil DeepSeek API
async function callDeepSeek(prompt: string, apiKey: string, model: string): Promise<string> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek API error');
    }
    
    return data.choices[0]?.message?.content || 'No content generated';
  } catch (error) {
    console.error('DeepSeek API error:', error);
    throw error;
  }
}

// Fungsi untuk memanggil OpenRouter API
async function callOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://budtrack.app',
        'X-Title': 'BudTrack'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenRouter API error');
    }
    
    return data.choices[0]?.message?.content || 'No content generated';
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
} 