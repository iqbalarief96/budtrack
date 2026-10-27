import { generateAIResponse } from './ai';

interface VoiceRecognitionResult {
  success: boolean;
  transaction?: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    categoryId?: string;
    walletId?: string;
    date?: string;
  };
  error?: string;
}

/**
 * Processes voice input and extracts transaction details
 * 
 * @param audioBlob Audio recording blob
 * @param apiKey API key for the speech recognition service
 * @param userSettings User settings including language and AI provider info
 * @param categories Available categories for classification
 * @param wallets Available wallets for the user
 * @returns Processed transaction details or error
 */
export async function processVoiceTransaction(
  audioBlob: Blob,
  apiKey: string,
  userSettings: {
    language: string;
    provider: string;
    selectedModel: string;
    customEndpoint?: string | null;
  },
  categories: Array<{id: string, name: string, type: 'INCOME' | 'EXPENSE' | 'BOTH'}>,
  wallets: Array<{id: string, name: string}>
): Promise<VoiceRecognitionResult> {
  try {
    // Convert audio to text using browser's Speech Recognition API
    const transcription = await convertSpeechToText(audioBlob, userSettings.language);
    
    if (!transcription) {
      return {
        success: false,
        error: 'Tidak dapat mengenali suara. Silakan coba lagi.'
      };
    }
    
    // Use AI to extract transaction details from the transcription
    const transactionDetails = await extractTransactionDetails(
      transcription,
      userSettings.provider,
      apiKey,
      userSettings.selectedModel,
      categories,
      wallets,
      userSettings.customEndpoint
    );
    
    return {
      success: true,
      transaction: transactionDetails
    };
  } catch (error) {
    console.error('Error processing voice transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses suara'
    };
  }
}

/**
 * Converts speech audio to text using the Web Speech API
 */
async function convertSpeechToText(audioBlob: Blob, language: string = 'id-ID'): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if Speech Recognition API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('Browser kamu tidak mendukung pengenalan suara. Coba gunakan Chrome atau Edge.'));
      return;
    }
    
    // Try two different methods to increase chances of success
    tryDirectTranscription(audioBlob, language)
      .then(transcription => {
        if (transcription) {
          resolve(transcription);
        } else {
          // If direct transcription fails, try playback method
          return tryPlaybackTranscription(audioBlob, language);
        }
      })
      .then(transcription => {
        if (transcription) {
          resolve(transcription);
        } else {
          // Last resort - try with a different language setting
          return tryPlaybackTranscription(audioBlob, 'en-US');
        }
      })
      .then(transcription => {
        if (transcription) {
          resolve(transcription);
        } else {
          reject(new Error('Tidak dapat mengenali suara. Coba berbicara lebih jelas atau lebih dekat dengan mikrofon.'));
        }
      })
      .catch(error => {
        console.error('Speech recognition error:', error);
        reject(error);
      });
  });
}

/**
 * Attempts to transcribe audio using a direct method (without playback)
 */
async function tryDirectTranscription(audioBlob: Blob, language: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = false;
      
      let finalTranscript = '';
      let errorOccurred = false;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Direct transcription error', event.error);
        errorOccurred = true;
        // Don't reject, just mark as error and let onend handle it
      };
      
      recognition.onend = () => {
        if (finalTranscript.trim()) {
          console.log('Direct transcription successful:', finalTranscript);
          resolve(finalTranscript.trim());
        } else {
          console.log('Direct transcription returned empty or error occurred');
          resolve(''); // Return empty string to indicate failure but not error
        }
      };
      
      // Set a timeout to stop recognition after 10 seconds if it doesn't end
      const timeout = setTimeout(() => {
        if (recognition) {
          recognition.stop();
        }
      }, 10000);
      
      // Start recognition
      recognition.start();
      
      // Pass in the audio context to improve recognition
      if (window.AudioContext || (window as any).webkitAudioContext) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        
        const reader = new FileReader();
        reader.onload = function() {
          if (reader.result instanceof ArrayBuffer) {
            audioContext.decodeAudioData(reader.result)
              .then(audioBuffer => {
                console.log('Audio buffer created for recognition');
                // The audio buffer is now available for further processing
                // Currently Web Speech API doesn't directly accept audioBuffer
              })
              .catch(error => {
                console.error('Error decoding audio data:', error);
              });
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      }
    } catch (error) {
      console.error('Error in direct transcription:', error);
      resolve(''); // Return empty to try the next method
    }
  });
}

/**
 * Attempts to transcribe audio by playing it back and listening
 */
async function tryPlaybackTranscription(audioBlob: Blob, language: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Create audio URL from blob for playback during recognition
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Initialize speech recognition
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = false;
      
      let finalTranscript = '';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Playback transcription error', event.error);
        // Don't reject, let onend handle it
      };
      
      recognition.onend = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(finalTranscript.trim());
      };
      
      // Increase volume to max
      audio.volume = 1.0;
      
      // Start playback and recognition together
      audio.onplay = () => {
        // Small delay to ensure audio starts playing before recognition
        setTimeout(() => {
          recognition.start();
        }, 100);
      };
      
      audio.onended = () => {
        // Give a small delay to finish processing
        setTimeout(() => {
          recognition.stop();
        }, 500);
      };
      
      audio.play().catch(error => {
        console.error('Error playing audio', error);
        resolve(''); // Return empty to try next method
      });
    } catch (error) {
      console.error('Error in playback transcription:', error);
      resolve(''); // Return empty to try the next method
    }
  });
}

/**
 * Uses AI to extract transaction details from the transcribed text
 */
async function extractTransactionDetails(
  transcription: string,
  provider: string,
  apiKey: string,
  model: string,
  categories: Array<{id: string, name: string, type: 'INCOME' | 'EXPENSE' | 'BOTH'}>,
  wallets: Array<{id: string, name: string}>,
  customEndpoint?: string | null
): Promise<{
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  categoryId?: string;
  walletId?: string;
  date?: string;
}> {
  // Create prompt for AI to extract transaction details
  const prompt = `
    Analisis transaksi keuangan dari kalimat berikut:
    "${transcription}"
    
    Kategori yang tersedia:
    ${categories.map(c => `- ${c.name} (${c.type})`).join('\n')}
    
    Dompet yang tersedia:
    ${wallets.map(w => `- ${w.name}`).join('\n')}
    
    Ekstrak detailnya dalam format JSON dengan struktur berikut:
    {
      "type": "INCOME" atau "EXPENSE",
      "amount": angka (tanpa mata uang atau tanda baca),
      "description": deskripsi transaksi,
      "categoryName": nama kategori (paling cocok dari daftar di atas),
      "walletName": nama dompet (paling cocok dari daftar di atas atau kosong jika tidak disebutkan),
      "date": tanggal dalam format "YYYY-MM-DD" (kosong jika tidak disebutkan, gunakan hari ini jika hanya menyebut "hari ini")
    }
    
    Contoh input:
    "Belanja di supermarket tadi 150 ribu dari dompet utama"
    
    Contoh output:
    {
      "type": "EXPENSE",
      "amount": 150000,
      "description": "Belanja di supermarket",
      "categoryName": "Food",
      "walletName": "Utama",
      "date": "2023-07-26"
    }
    
    Hanya berikan JSON, tanpa penjelasan tambahan.
  `;
  
  try {
    // Get AI response
    const response = await generateAIResponse({
      prompt,
      provider,
      apiKey,
      model,
      customEndpoint
    });
    
    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format respons AI tidak valid');
    }
    
    // Parse the JSON
    const parsedData = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsedData.type || !parsedData.amount || !parsedData.description) {
      throw new Error('Informasi transaksi tidak lengkap, mohon berikan detil lebih jelas');
    }
    
    // Find matching category ID from name
    let categoryId: string | undefined;
    if (parsedData.categoryName) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === parsedData.categoryName.toLowerCase() && 
             (c.type === parsedData.type || c.type === 'BOTH')
      );
      categoryId = matchedCategory?.id;
    }
    
    // Find matching wallet ID from name
    let walletId: string | undefined;
    if (parsedData.walletName) {
      const matchedWallet = wallets.find(
        w => w.name.toLowerCase() === parsedData.walletName.toLowerCase()
      );
      walletId = matchedWallet?.id;
    }
    
    return {
      type: parsedData.type,
      amount: parsedData.amount,
      description: parsedData.description,
      categoryId,
      walletId,
      date: parsedData.date
    };
  } catch (error) {
    console.error('Error extracting transaction details:', error);
    throw new Error('Tidak dapat mengekstrak detil transaksi dari input suara');
  }
}

// Types for TypeScript compatibility with the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
} 