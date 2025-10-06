'use server'

// Fungsi test untuk mengirim email langsung via Brevo API
export async function testBrevoEmail(targetEmail: string) {
  console.log(`Attempting to send test email to: ${targetEmail}`);
  
  const API_KEY = process.env.BREVO_API_KEY;
  if (!API_KEY) {
    console.error('BREVO_API_KEY tidak ditemukan di environment variables');
    return { success: false, error: 'API key not configured' };
  }

  try {
    // Mengirim email transaksional langsung via Brevo API v3
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'BudTrack Test',
          email: 'test@example.com' // Ganti dengan sender yang udah diverifikasi di dashboard
        },
        to: [
          {
            email: targetEmail,
            name: 'Test Recipient'
          }
        ],
        subject: 'Test Email dari BudTrack via Brevo API',
        htmlContent: `
          <html>
            <body>
              <h1>🔥 Test Email Berhasil! 🔥</h1>
              <p>Ini adalah email test dari BudTrack yang dikirim langsung lewat Brevo API.</p>
              <p>Jika kamu menerima email ini, berarti konfigurasi Brevo API kamu sudah benar!</p>
              <p>Waktu pengiriman: ${new Date().toLocaleString()}</p>
            </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from Brevo API:', errorData);
      return { 
        success: false, 
        status: response.status,
        error: errorData 
      };
    }

    const data = await response.json();
    console.log('Email test berhasil dikirim:', data);
    return { 
      success: true, 
      messageId: data.messageId 
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { 
      success: false, 
      error 
    };
  }
} 