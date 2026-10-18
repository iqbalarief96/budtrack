import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseScaleReportImage } from '@/lib/health-scale-parser'

export const dynamic = 'force-dynamic'

// Hitung delta antara record terkini dan sebelumnya
function computeDelta(current: any, previous: any | null) {
  if (!previous) return null
  const keys = [
    'weight', 'bmi', 'bodyFat', 'bodyWater', 'skeletalMuscle', 'boneMass',
    'protein', 'muscleRate', 'visceralFat', 'subcutaneousFat', 'leanBodyMass',
    'bmr', 'bodyAge', 'bodyScore',
  ]
  const delta: Record<string, number> = {}
  for (const k of keys) {
    if (current[k] != null && previous[k] != null) {
      const diff = Number((current[k] - previous[k]).toFixed(2))
      if (diff !== 0) delta[k] = diff
    }
  }
  return Object.keys(delta).length > 0 ? delta : null
}

export async function POST(req: NextRequest) {
  try {
    // 1. Autentikasi
    let userId: string | null = null

    const authHeader = req.headers.get('authorization')
    const queryKey = req.nextUrl.searchParams.get('key')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    let providedKey = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim()
    } else if (queryKey) {
      providedKey = queryKey.trim()
    }

    if (expectedKey && providedKey && providedKey === expectedKey) {
      const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] },
        select: { id: true },
      })
      if (user) userId = user.id
    }

    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sertakan Bearer API Key atau login session.' },
        { status: 401 }
      )
    }

    // 2. Ambil UserSettings untuk konfigurasi AI vision
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    // 3. Extract Image Base64
    let imageBase64 = ''
    let walletParam = ''
    let uploadedFormData: FormData | null = null
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      imageBase64 = body.imageBase64 || body.image || ''
      walletParam = body.wallet || body.walletName || ''
    } else if (contentType.includes('multipart/form-data')) {
      uploadedFormData = await req.formData()
      const file = uploadedFormData.get('file') as File || uploadedFormData.get('image') as File
      if (file) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        imageBase64 = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
      }
      walletParam = (uploadedFormData.get('wallet') as string) || (uploadedFormData.get('walletName') as string) || ''
    }

    // Juga cek query param ?wallet=...
    if (!walletParam) {
      walletParam = req.nextUrl.searchParams.get('wallet') || ''
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'File gambar report tidak ditemukan.' },
        { status: 400 }
      )
    }

    // 4. Resolve walletId
    let walletId: string | null = null
    if (walletParam) {
      const wallet = await prisma.wallet.findFirst({
        where: {
          userId,
          name: walletParam,
        },
        select: { id: true },
      })
      if (wallet) walletId = wallet.id
    }

    // 5. Proses OCR Vision dengan AI
    const parsedData = await parseScaleReportImage(imageBase64, userSettings)

    // Tentukan tanggal pengukuran
    // Selalu pakai hari ini sebagai default. Tanggal di report sering kali tanggal
    // pengukuran sebelumnya (comparator), bukan pengukuran terbaru.
    // User bisa override via form field 'date' kalau perlu backdate.
    let targetDate = new Date()
    const manualDate = uploadedFormData?.get('date') as string | null
    if (manualDate) {
      const d = new Date(manualDate)
      if (!isNaN(d.getTime())) targetDate = d
    }
    targetDate.setHours(0, 0, 0, 0)

    // 6. Simpan / Upsert ke tabel HealthMetric
    let existing = null
    if (walletId) {
      existing = await prisma.healthMetric.findFirst({
        where: { userId, date: targetDate, walletId },
      })
    } else {
      existing = await prisma.healthMetric.findFirst({
        where: { userId, date: targetDate, walletId: null },
      })
    }

    const payload: any = {
      source: 'scale_report_image',
      rawPayload: JSON.stringify(parsedData).slice(0, 5000),
      ...(parsedData.weight != null && { weight: parsedData.weight }),
      ...(parsedData.bmi != null && { bmi: parsedData.bmi }),
      ...(parsedData.bodyFat != null && { bodyFat: parsedData.bodyFat }),
      ...(parsedData.bodyWater != null && { bodyWater: parsedData.bodyWater }),
      ...(parsedData.skeletalMuscle != null && { skeletalMuscle: parsedData.skeletalMuscle }),
      ...(parsedData.boneMass != null && { boneMass: parsedData.boneMass }),
      ...(parsedData.protein != null && { protein: parsedData.protein }),
      ...(parsedData.muscleRate != null && { muscleRate: parsedData.muscleRate }),
      ...(parsedData.visceralFat != null && { visceralFat: parsedData.visceralFat }),
      ...(parsedData.subcutaneousFat != null && { subcutaneousFat: parsedData.subcutaneousFat }),
      ...(parsedData.leanBodyMass != null && { leanBodyMass: parsedData.leanBodyMass }),
      ...(parsedData.bmr != null && { bmr: parsedData.bmr }),
      ...(parsedData.bodyAge != null && { bodyAge: parsedData.bodyAge }),
      ...(parsedData.bodyScore != null && { bodyScore: parsedData.bodyScore }),
    }

    let savedRecord
    if (existing) {
      savedRecord = await prisma.healthMetric.update({
        where: { id: existing.id },
        data: payload,
      })
    } else {
      savedRecord = await prisma.healthMetric.create({
        data: {
          userId,
          date: targetDate,
          walletId,
          ...payload,
        },
      })
    }

    // 7. Cari record sebelumnya untuk delta
    const previousRecord = await prisma.healthMetric.findFirst({
      where: {
        userId,
        walletId: walletId ?? undefined,
        date: { lt: targetDate },
      },
      orderBy: { date: 'desc' },
    })

    const delta = computeDelta(savedRecord, previousRecord)

    // Build pesan ringkasan
    const parts: string[] = []
    if (savedRecord.weight) {
      let s = `Berat ${savedRecord.weight}kg`
      if (delta?.weight) s += ` (${delta.weight > 0 ? '+' : ''}${delta.weight})`
      parts.push(s)
    }
    if (savedRecord.bodyFat) {
      let s = `Lemak ${savedRecord.bodyFat}%`
      if (delta?.bodyFat) s += ` (${delta.bodyFat > 0 ? '+' : ''}${delta.bodyFat})`
      parts.push(s)
    }
    if (savedRecord.muscleRate) {
      let s = `Otot ${savedRecord.muscleRate}%`
      if (delta?.muscleRate) s += ` (${delta.muscleRate > 0 ? '+' : ''}${delta.muscleRate})`
      parts.push(s)
    }

    const walletLabel = walletParam ? ` [${walletParam}]` : ''
    const msg = `✅ Sukses scan timbangan${walletLabel}: ${parts.join(', ') || 'data tersimpan'}`

    return NextResponse.json({
      success: true,
      message: msg,
      data: savedRecord,
      delta,
      previousDate: previousRecord?.date?.toISOString().split('T')[0] || null,
    })
  } catch (error: any) {
    console.error('Scan scale report error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memproses gambar report timbangan.',
      },
      { status: 500 }
    )
  }
}
