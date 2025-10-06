import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MicrophoneIcon, StopIcon, XMarkIcon, ArrowPathIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '../../hooks/useTransactions';
import { processVoiceTransaction } from '@/lib/voice-recognition';
import TransactionModal from './TransactionModal';

type VoiceTransactionRecorderProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

export function VoiceTransactionRecorder({ onClose, onSuccess }: VoiceTransactionRecorderProps) {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [transactionData, setTransactionData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [settings, setSettings] = useState<{
    language: string;
    provider: string;
    apiKey: string;
    selectedModel: string;
  } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { fetchWallets, fetchCategories, createTransaction } = useTransactions();

  // Fetch user settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            language: data.language || 'id-ID',
            provider: data.provider || 'openrouter',
            apiKey: data.apiKey || '',
            selectedModel: data.selectedModel || 'openai/gpt-3.5-turbo'
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    }

    fetchSettings();
  }, []);

  // Fetch categories and wallets
  useEffect(() => {
    async function fetchData() {
      try {
        const categoriesData = await fetchCategories();
        const walletsData = await fetchWallets();
        setCategories(categoriesData || []);
        setWallets(walletsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    if (session?.user?.id) {
      fetchData();
    }
  }, [session, fetchCategories, fetchWallets]);

  const startRecording = async () => {
    setErrorMessage(null);
    setRecordingAttempts(prev => prev + 1);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Check if the recording is too short (less than 0.5 seconds)
        if (recordingTime < 0.5) {
          setErrorMessage('Rekaman terlalu pendek. Silakan coba lagi dan bicara lebih lama.');
          return;
        }
        
        processAudio(audioBlob);
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Tidak dapat mengakses mikrofon. Pastikan browser memiliki izin.');
      toast.error('Tidak dapat mengakses mikrofon. Pastikan browser memiliki izin.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!settings?.apiKey) {
      toast.error('API key tidak ditemukan. Silakan atur di halaman Settings.');
      setErrorMessage('API key tidak ditemukan. Silakan atur di halaman Settings.');
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const result = await processVoiceTransaction(
        audioBlob,
        settings.apiKey,
        settings,
        categories,
        wallets
      );
      
      if (result.success && result.transaction) {
        setTransactionData(result.transaction);
        setShowForm(true);
        toast.success('Transaksi berhasil dikenali! Silakan periksa dan konfirmasi.');
      } else {
        const errorMsg = result.error || 'Tidak dapat memproses suara. Silakan coba lagi.';
        toast.error(errorMsg);
        setErrorMessage(errorMsg);
        
        // Provide more specific guidance based on error type
        if (result.error?.includes('no-speech')) {
          setErrorMessage('Suara tidak terdeteksi. Pastikan mikrofon berfungsi dengan baik dan bicara lebih keras.');
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses suara';
      toast.error(errorMsg);
      setErrorMessage(errorMsg);
      
      // Specific guidance for known errors
      if (errorMsg.includes('no-speech')) {
        setErrorMessage('Suara tidak terdeteksi. Cobalah bicara lebih keras dan pastikan mikrofon berfungsi dengan baik.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransaction = async (transaction: any) => {
    try {
      await createTransaction(transaction);
      toast.success('Transaksi berhasil disimpan!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Gagal menyimpan transaksi');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show tips based on the number of failed attempts
  const getTips = () => {
    if (recordingAttempts <= 1) return null;
    
    return (
      <div className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
        <p className="font-medium">Tips untuk hasil yang lebih baik:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Bicara lambat dan jelas</li>
          <li>Sebutkan jumlah dengan jelas (misal: "seratus lima puluh ribu")</li>
          <li>Sebutkan kategori dan dompet yang sudah ada di aplikasi</li>
          <li>Coba gunakan headset atau mikrofon eksternal</li>
          <li>Pastikan berada di tempat yang tidak terlalu berisik</li>
        </ul>
      </div>
    );
  };

  if (showForm && transactionData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Konfirmasi Transaksi</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4 text-gray-500">
            Pastikan semua detail transaksi sudah benar sebelum menyimpan.
          </p>
          
          <TransactionModal
            isOpen={true}
            onClose={onClose}
            onSave={handleSaveTransaction}
            initialData={transactionData}
            isQuickAction={true}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Rekam Transaksi via Suara</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6">
          {isProcessing ? (
            <>
              <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin"></div>
              <p className="mt-4 text-gray-600">Memproses suara...</p>
            </>
          ) : (
            <>
              <div className="relative">
                <div className={`h-24 w-24 rounded-full flex items-center justify-center ${isRecording 
                  ? 'bg-red-100 animate-pulse' 
                  : 'bg-gray-100'}`}>
                  {isRecording ? (
                    <StopIcon className="h-12 w-12 text-red-500" />
                  ) : (
                    <MicrophoneIcon className="h-12 w-12 text-gray-500" />
                  )}
                </div>
                {isRecording && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center">
                    <span className="text-xs">{formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>
              
              <p className="mt-4 text-gray-600">
                {isRecording 
                  ? 'Mendengarkan...' 
                  : 'Tekan tombol untuk mulai rekam'}
              </p>
              
              {errorMessage && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <p>{errorMessage}</p>
                </div>
              )}
              
              {getTips()}
              
              {audioBlob && !isRecording && (
                <div className="mt-4 w-full">
                  <p className="text-sm text-gray-500 mb-1">Cek rekaman suara:</p>
                  <audio controls src={URL.createObjectURL(audioBlob)} className="mb-2 w-full" />
                </div>
              )}
              
              <div className="flex gap-2 mt-6">
                {isRecording ? (
                  <Button 
                    variant="destructive"
                    onClick={stopRecording}>
                    Berhenti
                  </Button>
                ) : (
                  <>
                    <Button 
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={startRecording}>
                      {audioBlob ? 'Rekam Ulang' : 'Mulai Rekam'}
                    </Button>
                    
                    {audioBlob && (
                      <Button 
                        variant="outline"
                        onClick={() => processAudio(audioBlob)}
                        className="flex items-center gap-1">
                        <ArrowPathIcon className="h-4 w-4" />
                        Coba Proses Ulang
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col text-xs text-gray-500">
        <div className="bg-amber-50 p-3 rounded-md w-full mb-2">
          <div className="flex items-start">
            <SpeakerWaveIcon className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Contoh kata-kata yang bisa dideteksi:</p>
              <p className="mt-1">"Belanja di supermarket hari ini 150 ribu dari dompet utama"</p>
              <p>"Terima gaji bulan ini 5 juta masuk ke rekening BCA"</p>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 