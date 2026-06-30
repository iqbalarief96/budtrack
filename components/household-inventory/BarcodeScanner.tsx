'use client'

import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => stopScan, [])

  const stopScan = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
  }

  const startScan = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Browser tidak bisa akses kamera. Masukkan barcode manual.')
      return
    }

    if (!videoRef.current) return

    try {
      setMessage('Membuka kamera...')
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, result => {
        const barcode = result?.getText().trim()
        if (!barcode) return
        stopScan()
        setMessage(`Barcode terbaca: ${barcode}`)
        onDetected(barcode)
      })

      controlsRef.current = controls
      setIsScanning(true)
      setMessage('Arahkan kamera HP ke barcode. Kalau gelap/gagal, pakai input manual.')
    } catch (error) {
      stopScan()
      const name = error instanceof Error ? error.name : 'Error'
      const detail = name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Allow camera permission dulu.'
        : 'Kamera/scanner gagal dibuka. Pakai input manual atau coba browser Chrome/Safari terbaru.'
      setMessage(detail)
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
        <p className="text-sm text-gray-600">Scanner kamera HP pakai ZXing. Manual input tetap tersedia.</p>
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
          inputMode="numeric"
          placeholder="Input barcode manual"
        />
        <Button type="button" variant="outline" onClick={submitManual}>Cari</Button>
      </div>
    </div>
  )
}
