import { generateVisionResponse } from './ai'
import path from 'path'
import os from 'os'

export interface ParsedScaleReport {
  weight?: number | null
  bmi?: number | null
  bodyFat?: number | null
  bodyWater?: number | null
  skeletalMuscle?: number | null
  boneMass?: number | null
  protein?: number | null
  muscleRate?: number | null
  visceralFat?: number | null
  subcutaneousFat?: number | null
  leanBodyMass?: number | null
  bmr?: number | null
  bodyAge?: number | null
  bodyScore?: number | null
  measurementDate?: string | null
  rawNotes?: string | null
}

const SCALE_OCR_PROMPT = `You are a high-precision medical & health body composition data OCR parser.
Analyze this smart scale / body composition report image and extract all numerical metrics into a strictly valid JSON object.

Expected JSON output format:
{
  "weight": 67.3,            // in kg (float)
  "bmi": 23.3,               // float
  "bodyFat": 22.4,           // body fat percentage % (float)
  "bodyWater": 51.3,         // body water percentage % (float, or null)
  "skeletalMuscle": 45.9,    // skeletal muscle percentage % (float, or null)
  "boneMass": 4.0,           // bone mass percentage % (float, or null)
  "protein": 22.3,           // protein percentage % (float, or null)
  "muscleRate": 73.6,        // muscle percentage % (float, or null)
  "visceralFat": 9,          // visceral fat index (integer, or null)
  "subcutaneousFat": 13.5,   // subcutaneous fat in kg (float, or null)
  "leanBodyMass": 52.2,      // lean body mass in kg (float, or null)
  "bmr": 1671,               // Basal Metabolic Rate in kcal (integer, or null)
  "bodyAge": 28,             // metabolic body age (integer, or null)
  "bodyScore": 86,           // overall body score 0-100 (integer, or null)
  "measurementDate": "2026-10-05" // date found on report in YYYY-MM-DD, or null if none
}

RULES:
1. Return ONLY the JSON object. Do not wrap with markdown backticks or explanation.
2. If any metric is missing or not visible in the image, set its value to null.
3. Clean percentage signs (%) and units (kg, kcal) so only numbers are returned.`

async function getLocal9RouterApiKey(): Promise<string | null> {
  try {
    const { execSync } = await import('child_process')
    // Cek di .9router atau .9router-go
    const dbPaths = [
      path.join(os.homedir(), '.9router', 'db', 'data.sqlite'),
      path.join(os.homedir(), '.9router-go', 'db', 'data.sqlite'),
    ]
    for (const p of dbPaths) {
      try {
        const out = execSync(`sqlite3 "${p}" "SELECT key FROM apiKeys WHERE isActive = 1 LIMIT 1;"`, {
          encoding: 'utf8',
          timeout: 2000,
        }).trim()
        if (out) return out
      } catch (_) {}
    }
    return null
  } catch {
    return null
  }
}

async function call9RouterVision(imageBase64: string, apiKey: string): Promise<string> {
  let base64Only = imageBase64
  if (base64Only.startsWith('data:')) {
    const idx = base64Only.indexOf('base64,')
    if (idx !== -1) base64Only = base64Only.substring(idx + 7)
  }

  // Coba port 20128 (9router v1 aktif dengan Antigravity vision) atau 20133
  const ports = [20128, 20133]
  let lastErr = ''

  for (const port of ports) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'ag/gemini-3.8-flash-high',
          stream: false,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: SCALE_OCR_PROMPT },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Only}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
      })

      if (response.ok) {
        const json = await response.json()
        const content = json.choices?.[0]?.message?.content
        if (content) return content
      } else {
        const txt = await response.text().catch(() => '')
        lastErr = `Port ${port} error ${response.status}: ${txt}`
      }
    } catch (e: any) {
      lastErr = `Port ${port} fetch failed: ${e.message}`
    }
  }

  throw new Error(lastErr || 'Gagal memanggil model vision lokal di 9Router.')
}

export async function parseScaleReportImage(
  imageBase64: string,
  userSettings: any
): Promise<ParsedScaleReport> {
  let responseText = ''

  // 1. Prioritaskan 9Router lokal (ag/gemini-3.8-flash-high)
  const routerKey = await getLocal9RouterApiKey()
  if (routerKey) {
    try {
      console.log('[SCALE-OCR] Memanggil 9Router Vision Gateway lokal...')
      responseText = await call9RouterVision(imageBase64, routerKey)
    } catch (e: any) {
      console.warn('[SCALE-OCR] 9Router lokal gagal, fallback ke userSettings:', e.message)
    }
  }

  // 2. Fallback ke konfigurasi API userSettings BudTrack jika lokal tidak berhasil
  if (!responseText) {
    const provider = userSettings?.provider || 'openai'
    const apiKey =
      userSettings?.customApiKey ||
      userSettings?.openaiApiKey ||
      userSettings?.geminiApiKey ||
      userSettings?.apiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('Tidak ada API Key Vision yang aktif di 9Router maupun Settings BudTrack.')
    }

    let model = userSettings?.selectedModel || 'gpt-4o-mini'
    if (provider === 'google') model = 'gemini-1.5-flash-latest'

    responseText = await generateVisionResponse({
      prompt: SCALE_OCR_PROMPT,
      imageBase64,
      provider,
      apiKey,
      model,
    })
  }

  // Clean JSON string
  let cleaned = responseText.trim()
  console.log('[SCALE-OCR] Raw AI response (first 500 chars):', cleaned.slice(0, 500))
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim()
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      weight: typeof parsed.weight === 'number' ? parsed.weight : null,
      bmi: typeof parsed.bmi === 'number' ? parsed.bmi : null,
      bodyFat: typeof parsed.bodyFat === 'number' ? parsed.bodyFat : null,
      bodyWater: typeof parsed.bodyWater === 'number' ? parsed.bodyWater : null,
      skeletalMuscle: typeof parsed.skeletalMuscle === 'number' ? parsed.skeletalMuscle : null,
      boneMass: typeof parsed.boneMass === 'number' ? parsed.boneMass : null,
      protein: typeof parsed.protein === 'number' ? parsed.protein : null,
      muscleRate: typeof parsed.muscleRate === 'number' ? parsed.muscleRate : null,
      visceralFat: typeof parsed.visceralFat === 'number' ? Math.round(parsed.visceralFat) : null,
      subcutaneousFat: typeof parsed.subcutaneousFat === 'number' ? parsed.subcutaneousFat : null,
      leanBodyMass: typeof parsed.leanBodyMass === 'number' ? parsed.leanBodyMass : null,
      bmr: typeof parsed.bmr === 'number' ? Math.round(parsed.bmr) : null,
      bodyAge: typeof parsed.bodyAge === 'number' ? Math.round(parsed.bodyAge) : null,
      bodyScore: typeof parsed.bodyScore === 'number' ? Math.round(parsed.bodyScore) : null,
      measurementDate: parsed.measurementDate || null,
    }
  } catch (err: any) {
    console.error('Failed to parse AI vision output as JSON:', responseText)
    throw new Error('Gagal mengekstrak JSON dari output AI Vision: ' + err.message)
  }
}
