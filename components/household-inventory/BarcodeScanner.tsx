'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor
  }
}

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => stopScan, [])

  const stopScan = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }

  const startScan = async () => {
    if (!window.BarcodeDetector) {
      setMessage('Browser belum support scanner native. Masukkan barcode manual.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsScanning(true)
      setMessage('Arahkan kamera ke barcode.')

      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return
        const codes = await detector.detect(videoRef.current).catch(() => [])
        const barcode = codes[0]?.rawValue?.trim()
        if (barcode) {
          stopScan()
          onDetected(barcode)
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      stopScan()
      setMessage('Kamera gagal dibuka. Masukkan barcode manual.')
    }
  }

  const submitManual = () => {
    const barcode = manualBarcode.trim()
    if (!barcode) return
    onDetected(barcode)
    setManualBarcode('')
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">Scan Barcode</h3>
        <p className="text-sm text-gray-600">Native scanner dulu. Manual input selalu tersedia.</p>
      </div>

      <video ref={videoRef} className="aspect-video w-full rounded-lg bg-gray-100 object-cover" muted playsInline />

      {message && <p className="text-sm text-gray-600">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={startScan} disabled={isScanning}>Mulai Scan</Button>
        <Button type="button" variant="outline" onClick={stopScan} disabled={!isScanning}>Stop</Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={manualBarcode}
          onChange={event => setManualBarcode(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') submitManual()
          }}
          placeholder="Input barcode manual"
        />
        <Button type="button" variant="outline" onClick={submitManual}>Cari</Button>
      </div>
    </div>
  )
}
