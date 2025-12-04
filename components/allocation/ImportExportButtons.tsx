'use client';

import { useState, useRef } from 'react';

interface Props {
  configId?: string;
  onImport: (data: any) => void;
}

export default function ImportExportButtons({ configId, onImport }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ data: any; preview: string } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!configId) {
      setError('Pilih konfigurasi untuk diekspor');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const response = await fetch('/api/salary-allocation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal mengekspor');
        return;
      }

      // Download file
      const blob = new Blob([data.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError('');

    try {
      const text = await file.text();

      const response = await fetch('/api/salary-allocation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal mengimpor');
        return;
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch {
      setError('Terjadi kesalahan membaca file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (previewData) {
      onImport(previewData.data);
      setShowPreview(false);
      setPreviewData(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting || !configId}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {isExporting ? '...' : '📤 Export'}
        </button>

        <label className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer">
          {isImporting ? '...' : '📥 Import'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isImporting}
          />
        </label>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Preview Import</h3>

            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-60 whitespace-pre-wrap">
              {previewData.preview}
            </pre>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
