import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function normalizeDate(dateInput?: string | Date): Date {
  const d = dateInput ? new Date(dateInput) : new Date()
  if (isNaN(d.getTime())) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }
  d.setHours(0, 0, 0, 0)
  return d
}

// Hitung delta antara record terkini dan sebelumnya
function computeDelta(current: any, previous: any | null) {
  if (!previous) return null
  const keys = [
    'weight', 'bmi', 'bodyFat', 'bodyWater', 'skeletalMuscle', 'boneMass',
    'protein', 'muscleRate', 'visceralFat', 'subcutaneousFat', 'leanBodyMass',
    'bmr', 'bodyAge', 'bodyScore', 'steps', 'activeCalories', 'restingHeartRate',
    'sleepHours', 'walkingDistance', 'flightsClimbed',
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
    // 1. Autentikasi: Cek Bearer token (Shortcut) atau Session (Web Dashboard)
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
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        userId = session.user.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Harap sertakan Bearer API Key atau login.' },
        { status: 401 }
      )
    }

    // 2. Parse Body JSON
    const body = await req.json()
    const targetDate = normalizeDate(body.date)

    // Helper number parsing
    const toFloat = (val: any): number | null => {
      if (val === undefined || val === null || val === '') return null
      const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'))
      return isNaN(n) ? null : n
    }

    const toInt = (val: any): number | null => {
      if (val === undefined || val === null || val === '') return null
      const n = typeof val === 'number' ? Math.round(val) : parseInt(String(val), 10)
      return isNaN(n) ? null : n
    }

    const weight = toFloat(body.weight)
    const bmi = toFloat(body.bmi)
    const bodyFat = toFloat(body.bodyFat ?? body.body_fat)
    const bodyWater = toFloat(body.bodyWater ?? body.body_water)
    const skeletalMuscle = toFloat(body.skeletalMuscle ?? body.skeletal_muscle)
    const boneMass = toFloat(body.boneMass ?? body.bone_mass)
    const protein = toFloat(body.protein)
    const muscleRate = toFloat(body.muscleRate ?? body.muscle_rate ?? body.muscle)
    const visceralFat = toInt(body.visceralFat ?? body.visceral_fat)
    const subcutaneousFat = toFloat(body.subcutaneousFat ?? body.subcutaneous_fat)
    const leanBodyMass = toFloat(body.leanBodyMass ?? body.lean_body_mass)
    const bmr = toInt(body.bmr)
    const bodyAge = toInt(body.bodyAge ?? body.body_age)
    const bodyScore = toInt(body.bodyScore ?? body.body_score)

    const steps = toInt(body.steps)
    const activeCalories = toFloat(body.activeCalories ?? body.active_calories ?? body.calories)
    const restingHeartRate = toInt(body.restingHeartRate ?? body.resting_heart_rate ?? body.heartRate ?? body.heart_rate)
    // Auto-normalize sleep: iOS Shortcuts Get Details → Duration returns MINUTES
    // 23 = 23 menit, 420 = 7 jam (420 menit), 7.2 = sudah jam
    let sleepHours = toFloat(body.sleepHours ?? body.sleep_hours ?? body.sleep)
    if (sleepHours !== null) {
      if (sleepHours > 1440) sleepHours = null // > 24 jam dalam menit = invalid
      else if (sleepHours > 24) sleepHours = Number((sleepHours / 60).toFixed(2)) // > 24 = menit, convert ke jam
      // else: 0-24 range = sudah jam atau menit kecil yang memang valid
    }

    // Jarak: iOS return km langsung (kecil). Hanya convert kalau > 500 (artinya meter)
    let walkingDistance = toFloat(body.walkingDistance ?? body.walking_distance ?? body.distance)
    if (walkingDistance !== null && walkingDistance > 500) {
      walkingDistance = Number((walkingDistance / 1000).toFixed(3))
    }

    const flightsClimbed = toInt(body.flightsClimbed ?? body.flights_climbed ?? body.flights)

    const source = (body.source || 'apple_health').trim()
    const rawPayload = JSON.stringify(body).slice(0, 5000)

    // 3. Resolve walletId dari nama wallet (opsional)
    let walletId: string | null = null
    const walletParam = body.wallet || body.walletName || body.wallet_name
    if (walletParam) {
      const wallet = await prisma.wallet.findFirst({
        where: {
          userId,
          name: walletParam,
        },
        select: { id: true },
      })
      if (wallet) {
        walletId = wallet.id
      }
      // Kalau wallet nggak ditemukan, tetap lanjut tanpa walletId (fallback umum)
    }

    // 4. Upsert data ke database (unique: userId + date + walletId)
    const whereClause = {
      userId_date_walletId: {
        userId,
        date: targetDate,
        walletId: walletId ?? '',
      },
    }

    // Prisma @@unique dengan nullable field: null != null di unique constraint
    // Kita perlu handle manual karena Prisma compound unique nggak support null
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

    const payloadData: any = {
      source,
      rawPayload,
      ...(weight !== null && { weight }),
      ...(bmi !== null && { bmi }),
      ...(bodyFat !== null && { bodyFat }),
      ...(bodyWater !== null && { bodyWater }),
      ...(skeletalMuscle !== null && { skeletalMuscle }),
      ...(boneMass !== null && { boneMass }),
      ...(protein !== null && { protein }),
      ...(muscleRate !== null && { muscleRate }),
      ...(visceralFat !== null && { visceralFat }),
      ...(subcutaneousFat !== null && { subcutaneousFat }),
      ...(leanBodyMass !== null && { leanBodyMass }),
      ...(bmr !== null && { bmr }),
      ...(bodyAge !== null && { bodyAge }),
      ...(bodyScore !== null && { bodyScore }),
      ...(steps !== null && { steps }),
      ...(activeCalories !== null && { activeCalories }),
      ...(restingHeartRate !== null && { restingHeartRate }),
      ...(sleepHours !== null && { sleepHours }),
      ...(walkingDistance !== null && { walkingDistance }),
      ...(flightsClimbed !== null && { flightsClimbed }),
    }

    let result
    if (existing) {
      result = await prisma.healthMetric.update({
        where: { id: existing.id },
        data: payloadData,
      })
    } else {
      result = await prisma.healthMetric.create({
        data: {
          userId,
          date: targetDate,
          walletId,
          ...payloadData,
        },
      })
    }

    // 5. Cari record sebelumnya untuk delta insight
    const previousRecord = await prisma.healthMetric.findFirst({
      where: {
        userId,
        walletId: walletId ?? undefined,
        date: { lt: targetDate },
      },
      orderBy: { date: 'desc' },
    })

    const delta = computeDelta(result, previousRecord)

    // 6. Buat pesan ringkasan dengan delta
    const summaryParts: string[] = []
    if (result.weight) {
      let s = `Berat: ${result.weight}kg`
      if (delta?.weight) s += ` (${delta.weight > 0 ? '+' : ''}${delta.weight})`
      summaryParts.push(s)
    }
    if (result.bodyFat) {
      let s = `Lemak: ${result.bodyFat}%`
      if (delta?.bodyFat) s += ` (${delta.bodyFat > 0 ? '+' : ''}${delta.bodyFat})`
      summaryParts.push(s)
    }
    if (result.steps) {
      summaryParts.push(`Langkah: ${result.steps.toLocaleString('id-ID')}`)
    }
    if (result.sleepHours) {
      summaryParts.push(`Tidur: ${result.sleepHours}jam`)
    }
    if (result.walkingDistance) {
      summaryParts.push(`Jarak: ${result.walkingDistance}km`)
    }
    if (result.restingHeartRate) {
      summaryParts.push(`Detak Jantung: ${result.restingHeartRate}bpm`)
    }

    const walletLabel = walletParam ? ` [${walletParam}]` : ''
    const friendlyMessage = summaryParts.length > 0
      ? `✅ Data Kesehatan Tersimpan${walletLabel}: ${summaryParts.join(' | ')}`
      : `✅ Data Kesehatan Tersimpan${walletLabel}.`

    return NextResponse.json({
      success: true,
      message: friendlyMessage,
      data: result,
      delta,
      previousDate: previousRecord?.date?.toISOString().split('T')[0] || null,
    })
  } catch (error: any) {
    console.error('Health sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat menyimpan data kesehatan.',
      },
      { status: 400 }
    )
  }
}
