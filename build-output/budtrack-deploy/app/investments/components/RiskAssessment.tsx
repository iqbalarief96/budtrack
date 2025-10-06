'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Definisikan tipe untuk pertanyaan dan jawaban
type Question = {
  id: string;
  text: string;
  options: { value: string; label: string; score: number }[];
};

type Answers = {
  [questionId: string]: string | undefined; // Menyimpan value dari option yang dipilih
};

type RiskProfile = 'Konservatif' | 'Moderat' | 'Agresif' | null;

// Kunci untuk localStorage
const LOCAL_STORAGE_KEYS = {
  ANSWERS: 'risk-assessment-answers',
  RISK_PROFILE: 'risk-assessment-profile',
  AI_EXPLANATION: 'risk-assessment-explanation'
};

// Contoh Pertanyaan
const questions: Question[] = [
  {
    id: 'q1',
    text: 'Dalam jangka waktu berapa lama Anda berencana untuk menggunakan sebagian besar dana investasi ini?',
    options: [
      { value: '1', label: 'Kurang dari 2 tahun', score: 1 },
      { value: '2', label: '2 hingga 5 tahun', score: 2 },
      { value: '3', label: '5 hingga 10 tahun', score: 3 },
      { value: '4', label: 'Lebih dari 10 tahun', score: 4 },
    ],
  },
  {
    id: 'q2',
    text: 'Apa tujuan utama Anda dalam berinvestasi?',
    options: [
      { value: '1', label: 'Menjaga nilai pokok (keamanan modal)', score: 1 },
      { value: '2', label: 'Mendapatkan penghasilan reguler', score: 2 },
      { value: '3', label: 'Keseimbangan antara pertumbuhan dan keamanan', score: 3 },
      { value: '4', label: 'Pertumbuhan modal yang maksimal', score: 4 },
    ],
  },
  {
    id: 'q3',
    text: 'Bagaimana reaksi Anda jika nilai investasi Anda tiba-tiba turun 20% dalam waktu singkat?',
    options: [
      { value: '1', label: 'Sangat khawatir dan mungkin akan menjual sebagian besar investasi', score: 1 },
      { value: '2', label: 'Khawatir, tapi akan menunggu dan melihat perkembangan', score: 2 },
      { value: '3', label: 'Melihatnya sebagai kesempatan untuk menambah investasi sedikit', score: 3 },
      { value: '4', label: 'Melihatnya sebagai peluang beli yang signifikan', score: 4 },
    ],
  },
  {
    id: 'q4',
    text: 'Seberapa besar pengalaman Anda dalam berinvestasi?',
    options: [
      { value: '1', label: 'Pemula, baru mulai berinvestasi', score: 1 },
      { value: '2', label: 'Sedikit pengalaman, pernah berinvestasi di instrumen sederhana', score: 2 },
      { value: '3', label: 'Cukup berpengalaman dengan berbagai instrumen investasi', score: 3 },
      { value: '4', label: 'Sangat berpengalaman, termasuk dengan instrumen kompleks', score: 4 },
    ],
  },
  {
    id: 'q5',
    text: 'Berapa persen dari penghasilan Anda yang biasanya dialokasikan untuk investasi?',
    options: [
      { value: '1', label: 'Kurang dari 5%', score: 1 },
      { value: '2', label: '5% hingga 10%', score: 2 },
      { value: '3', label: '11% hingga 20%', score: 3 },
      { value: '4', label: 'Lebih dari 20%', score: 4 },
    ],
  },
];

const RiskAssessment = () => {
  const [answers, setAnswers] = useState<Answers>({});
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    // Only run in client-side
    if (typeof window !== 'undefined') {
      try {
        // Load answers
        const savedAnswers = localStorage.getItem(LOCAL_STORAGE_KEYS.ANSWERS);
        if (savedAnswers) {
          setAnswers(JSON.parse(savedAnswers));
        }

        // Load risk profile
        const savedProfile = localStorage.getItem(LOCAL_STORAGE_KEYS.RISK_PROFILE);
        if (savedProfile) {
          setRiskProfile(savedProfile as RiskProfile);
        }

        // Load AI explanation
        const savedExplanation = localStorage.getItem(LOCAL_STORAGE_KEYS.AI_EXPLANATION);
        if (savedExplanation) {
          setAiExplanation(savedExplanation);
        }
      } catch (err) {
        console.error('Error loading data from localStorage:', err);
      }
    }
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWERS, JSON.stringify(newAnswers));
    }
    
    setRiskProfile(null); // Reset profile jika jawaban berubah
    
    // Clear saved profile and explanation from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.RISK_PROFILE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AI_EXPLANATION);
    }
  };

  const calculateProfile = () => {
    setError(null); 
    setIsLoading(true); // Mulai loading
    setRiskProfile(null); // Reset profile sebelum kalkulasi baru

    // Pastikan semua pertanyaan dijawab
    const allAnswered = questions.every(q => answers[q.id] !== undefined);
    if (!allAnswered) {
        setError("Mohon jawab semua pertanyaan.");
        setIsLoading(false); // Stop loading
        return;
    }

    const totalScore = questions.reduce((acc, question) => {
      const answerValue = answers[question.id];
      const selectedOption = question.options.find(opt => opt.value === answerValue);
      return acc + (selectedOption?.score || 0);
    }, 0);


    // Tentukan Profil berdasarkan Skor
    let calculatedProfile: RiskProfile = null;
    
    // Dengan 5 pertanyaan, skor maksimal adalah 20 (jika semua jawaban skor 4)
    if (totalScore <= 10) {
      calculatedProfile = 'Konservatif';
    } else if (totalScore <= 15) {
      calculatedProfile = 'Moderat';
    } else {
      calculatedProfile = 'Agresif';
    }
    
    // Simpan hasil profile ke server
    async function saveProfile(profile: RiskProfile) {
      try {
        const response = await fetch('/api/user/risk-profile', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ riskProfile: profile }) 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal menyimpan profil');
        }
        
        return await response.json();
      } catch (err) {
        console.error('Error saving profile:', err);
        setError('Terjadi kesalahan saat menyimpan profil Anda, tetapi hasil perhitungan tetap ditampilkan.');
        return null;
      }
    }
    
    // Mendapatkan penjelasan dari AI
    async function getAiExplanation(profile: RiskProfile) {
      try {
        setIsAiLoading(true);
        const response = await fetch('/api/ai/explain-risk-profile', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }) 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal mendapatkan penjelasan AI');
        }
        
        const data = await response.json();
        setAiExplanation(data.explanation);
        
        // Save explanation to localStorage
        if (typeof window !== 'undefined' && data.explanation) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.AI_EXPLANATION, data.explanation);
        }
      } catch (err) {
        console.error('Error fetching AI explanation:', err);
        setError((prev) => prev ? `${prev}. Gagal mendapatkan penjelasan AI.` : 'Gagal mendapatkan penjelasan AI.');
      } finally {
        setIsAiLoading(false);
      }
    }
    
    // Simulasi API call
    setTimeout(async () => {
        console.log("Calculated Score:", totalScore);
        console.log("Calculated Profile:", calculatedProfile);
        setRiskProfile(calculatedProfile);
        
        // Save to localStorage
        if (typeof window !== 'undefined' && calculatedProfile) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.RISK_PROFILE, calculatedProfile);
        }
        
        // Simpan profil ke API
        if (calculatedProfile) {
          await saveProfile(calculatedProfile);
          // Dapatkan penjelasan AI
          await getAiExplanation(calculatedProfile);
        }
        
        setIsLoading(false); // Selesai loading
    }, 1000); // Simulasi delay 1 detik
  };

  // Mengecek apakah semua pertanyaan sudah dijawab
  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Jawab pertanyaan berikut untuk membantu kami memahami toleransi risiko dan tujuan investasi Anda.
        Hasil penilaian ini akan membantu memberikan rekomendasi alokasi aset yang sesuai dengan profil Anda.
      </p>

      {questions.map((question) => (
        <div key={question.id} className="space-y-3 border-t pt-4">
          <Label className="font-semibold text-base">{question.text}</Label>
          <RadioGroup
            value={answers[question.id]}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-2"
          >
            {question.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 p-2 rounded-md border border-transparent hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="font-normal cursor-pointer flex-grow">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      <div className="flex justify-end pt-4">
        <Button onClick={calculateProfile} disabled={isLoading || !allQuestionsAnswered}>
          {isLoading ? "Menghitung..." : "Lihat Profil Risiko Saya"}
        </Button>
      </div>


      {riskProfile && !isLoading && (
        <div className="mt-6 p-6 border rounded-lg bg-muted/30 animate-in fade-in duration-500">
          <h3 className="text-xl font-semibold mb-3 text-primary">Profil Risiko Anda: {riskProfile}</h3>
          
          <div className="space-y-3 text-sm">
            {/* Ini adalah penjelasan dasar yang akan ditampilkan ketika AI belum diintegrasikan */}
            {!aiExplanation && !isAiLoading && (
              <p>
                {riskProfile === 'Konservatif' && "Anda cenderung lebih mengutamakan keamanan modal dan menghindari fluktuasi harga yang besar. Investasi dengan risiko lebih rendah mungkin cocok untuk Anda."}
                {riskProfile === 'Moderat' && "Anda bersedia mengambil risiko yang terukur untuk potensi imbal hasil yang lebih baik, namun tetap menjaga keseimbangan portofolio."}
                {riskProfile === 'Agresif' && "Anda nyaman dengan risiko yang lebih tinggi demi potensi keuntungan maksimal dalam jangka panjang, dan dapat menoleransi volatilitas pasar."}
              </p>
            )}

            {/* Loading state untuk AI */}
            {isAiLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Memuat penjelasan detail dari AI...</p>
              </div>
            )}

            {/* Penjelasan AI */}
            {aiExplanation && !isAiLoading && (
              <div className="prose prose-sm max-w-none">
                {aiExplanation.split('\n\n').map((paragraph, index) => (
                  <p key={index} className={index === 0 ? 'font-medium' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            
            {!aiExplanation && !isAiLoading && (
              <p className="italic text-muted-foreground mt-4">
                (Penjelasan lebih detail memerlukan pengaturan AI yang valid.)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAssessment; 