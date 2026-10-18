import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAIResponse } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    let userId = session?.user?.id

    // Fallback jika dipanggil via API key
    if (!userId) {
      const authHeader = req.headers.get('authorization')
      const expectedKey = process.env.QUICK_CAPTURE_API_KEY
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === expectedKey) {
        const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
        const u = await prisma.user.findFirst({ where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] }, select: { id: true } })
        if (u) userId = u.id
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Ambil Pengaturan AI Pengguna
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    const provider = (userSettings?.provider || 'deepseek').toLowerCase()
    const model = userSettings?.selectedModel || 'deepseek-chat'
    let apiKey = userSettings?.apiKey || ''

    if (provider === 'deepseek') {
      apiKey = userSettings?.deepseekApiKey || userSettings?.apiKey || ''
    } else if (provider === 'openrouter') {
      apiKey = userSettings?.openrouterApiKey || userSettings?.apiKey || ''
    } else if (provider === 'custom') {
      apiKey = userSettings?.customApiKey || userSettings?.apiKey || ''
    } else if (provider === 'openai') {
      apiKey = userSettings?.openaiApiKey || userSettings?.apiKey || ''
    } else if (provider === 'google') {
      apiKey = userSettings?.geminiApiKey || userSettings?.apiKey || ''
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: `API Key untuk provider '${provider}' belum dikonfigurasi di menu Settings BudTrack.`,
        },
        { status: 400 }
      )
    }

    // 2. Tarik Data Kesehatan 30 Hari Terakhir
    const healthData = await prisma.healthMetric.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 30,
    })

    if (healthData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Belum ada data kesehatan yang tercatat. Silakan sync dari Apple Health atau scan laporan timbangan terlebih dahulu.',
        },
        { status: 400 }
      )
    }

    // 3. Tarik Data Transaksi Finansial 30 Hari Terakhir
    const startDate = healthData[0].date
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate },
        type: 'EXPENSE',
      },
      include: {
        category: true,
      },
      orderBy: { date: 'asc' },
    })

    // 4. Rangkum Data untuk Prompt AI
    const healthSummary = healthData.map((h) => ({
      date: h.date.toISOString().split('T')[0],
      weightKg: h.weight,
      bodyFatPct: h.bodyFat,
      steps: h.steps,
      restingHr: h.restingHeartRate,
      caloriesBurned: h.activeCalories,
      bmr: h.bmr,
    }))

    // Kelompokkan pengeluaran per hari & kategori
    const expenseByDate: Record<string, { total: number; categories: Record<string, number> }> = {}
    transactions.forEach((tx) => {
      const d = tx.date.toISOString().split('T')[0]
      if (!expenseByDate[d]) {
        expenseByDate[d] = { total: 0, categories: {} }
      }
      expenseByDate[d].total += tx.amount
      const catName = tx.category?.name || 'Lain-lain'
      expenseByDate[d].categories[catName] = (expenseByDate[d].categories[catName] || 0) + tx.amount
    })

    // Hitung total kategori F&B / Belanja
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0)

    const prompt = `Anda adalah analis ahli keuangan perilaku (Behavioral Finance) dan kesehatan personal untuk BudTrack.
Tugas Anda adalah menganalisis korelasi nyata antara data kesehatan pengguna (dari Huawei Fit 4 & Timbangan Badan BIA) dengan pengeluaran keuangannya.

Berikut adalah data pengguna selama periode pengamatan:

DATA KESEHATAN HARIAN:
${JSON.stringify(healthSummary, null, 2)}

DATA PENGELUARAN HARIAN (EXPENSE):
${JSON.stringify(expenseByDate, null, 2)}

TOTAL PENGELUARAN PERIODE INI: Rp ${totalSpent.toLocaleString('id-ID')}

INSTRUKSI ANALISIS:
1. Analisis korelasi gaya hidup dan finansial:
   - Apakah ada hubungan antara fluktuasi berat badan / body fat dengan lonjakan spending makanan (F&B / Kafe / Restoran)?
   - Apakah hari-hari dengan langkah kaki rendah / heart rate tinggi bertepatan dengan pengeluaran impulsif (hiburan, belanja, retail therapy)?
   - Apakah ada pola aktivitas fisik tinggi yang diikuti pengeluaran tertentu?
2. Berikan analisis yang tajam, spesifik, berbasis angka riil di atas, dan BEBAS basa-basi/klise AI.
3. Berikan saran praktis dan terukur untuk minggu berikutnya.

FORMAT OUTPUT (Wajib format Markdown rapi):
### 📊 Ringkasan Korelasi
(2-3 paragraf analisis tajam berdasarkan data riil)

### 🔍 Temuan Kunci Pola Finansial & Kesehatan
- **Poin 1**: Analisis temuan korelasi spesifik
- **Poin 2**: Analisis pola aktivitas vs pengeluaran
- **Poin 3**: Catatan metrik kebugaran

### 💡 Rekomendasi Terukur
1. Langkah konkret perbaikan anggaran & pola makan
2. Target aktivitas harian yang realistis`

    // 5. Panggil AI Engine — coba non-streaming dulu, fallback ke streaming untuk model reasoning (AG/Kiro)
    let analysisResult = ''

    try {
      analysisResult = await generateAIResponse({
        prompt,
        provider,
        apiKey,
        model,
        customEndpoint: userSettings?.customEndpoint,
        temperature: 0.2,
        maxTokens: 2000,
        timeoutMs: 60000,
      })
    } catch (nonStreamErr: any) {
      const is502 = nonStreamErr.message?.includes('502') || nonStreamErr.status === 502
      const isTimeout = nonStreamErr.message?.includes('timed out') || nonStreamErr.message?.includes('timeout')

      if ((is502 || isTimeout) && provider === 'custom' && userSettings?.customEndpoint) {
        // Fallback: kirim streaming request langsung ke custom endpoint, kumpulkan chunk sendiri
        console.log('[AI-CORRELATION] Non-streaming gagal, fallback ke streaming...')
        const baseUrl = userSettings.customEndpoint.replace(/\/+$/, '')
        const streamRes = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 2000,
          }),
          signal: AbortSignal.timeout(90000),
        })

        if (!streamRes.ok) {
          const errText = await streamRes.text().catch(() => '')
          throw new Error(`Streaming juga gagal (${streamRes.status}): ${errText.slice(0, 200)}`)
        }

        // Parse SSE stream dan kumpulkan content chunks
        const reader = streamRes.body?.getReader()
        if (!reader) throw new Error('Stream body kosong')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue
            const payload = trimmed.slice(6).trim()
            if (payload === '[DONE]') continue

            try {
              const chunk = JSON.parse(payload)
              const delta = chunk.choices?.[0]?.delta
              if (delta?.content) {
                analysisResult += delta.content
              } else if (delta?.reasoning_content) {
                // Skip reasoning tokens, hanya ambil content
              }
            } catch (_) {}
          }
        }

        if (!analysisResult.trim()) {
          throw new Error('Streaming berhasil tapi tidak ada content yang diterima dari model.')
        }
      } else {
        throw nonStreamErr
      }
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      provider,
      model,
      analyzedDays: healthData.length,
      totalExpenses: totalSpent,
    })
  } catch (error: any) {
    console.error('AI Health correlation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal menghasilkan analisis korelasi AI.',
      },
      { status: 500 }
    )
  }
}
