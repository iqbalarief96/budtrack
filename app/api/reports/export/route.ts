import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateAIResponse } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { walletId, startDate, endDate, reportType, format, data, includeAnalysis = false } = await request.json()
    
    if (!walletId || !data || !format) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Check if user has access to this wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    let buffer: Buffer
    let contentType: string
    let filename: string
    
    switch (format) {
      case 'pdf':
        // For PDF, combine all data and optionally include AI analysis
        let completeData = data;
        
        // If this is a combined report, data is already complete
        // Otherwise fetch data for other report types if necessary
        if (reportType !== 'all' && includeAnalysis) {
          completeData = await fetchAllReportData(walletId, startDate, endDate, reportType, data);
        }
        
        // Generate AI analysis if requested
        let aiAnalysis = null;
        if (includeAnalysis) {
          aiAnalysis = await generateReportAnalysis(session.user.id, completeData, startDate, endDate, wallet);
        }
        
        buffer = await generatePDF(completeData, reportType, startDate, endDate, wallet, aiAnalysis)
        contentType = 'application/pdf'
        filename = `${reportType}_report.pdf`
        break;
      case 'excel':
        buffer = generateExcel(data, reportType)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `${reportType}_report.xlsx`
        break
      case 'csv':
        buffer = generateCSV(data, reportType)
        contentType = 'text/csv; charset=utf-8' // Explicit charset
        filename = `${reportType}_report.csv`
        break
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
    
    // Return the file as a download with explicit charset
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}

// Helper function to fetch all report data
async function fetchAllReportData(walletId: string, startDate: string, endDate: string, originalReportType: string, originalData: any): Promise<any> {
  try {
    // Create a complete dataset with data from all report types
    const completeData = { ...originalData };
    
    // List of all report types
    const reportTypes = ['summary', 'transactions', 'categories', 'trends'];
    
    // Filter out the original report type
    const typesToFetch = reportTypes.filter(type => type !== originalReportType);
    
    // Fetch each missing report type
    for (const type of typesToFetch) {
      const response = await fetch(
        `/api/reports/generate?walletId=${walletId}&start=${startDate}&end=${endDate}&type=${type}`,
        { method: 'GET' }
      );
      
      if (response.ok) {
        const reportData = await response.json();
        
        // Merge the new data with our complete dataset
        // Avoid overwriting existing properties like totalIncome, totalExpenses, netCashFlow
        Object.keys(reportData).forEach(key => {
          if (!completeData[key]) {
            completeData[key] = reportData[key];
          }
        });
      }
    }
    
    return completeData;
  } catch (error) {
    console.error('Error fetching all report data:', error);
    // Return original data if we encounter an error
    return originalData;
  }
}

// Helper function to generate AI analysis for the report
async function generateReportAnalysis(userId: string, data: any, startDate: string, endDate: string, wallet: any): Promise<string | null> {
  try {
    // Get user's AI settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    if (!settings?.provider || !settings?.apiKey || !settings?.selectedModel) {
      console.warn('AI settings not configured for user');
      return null;
    }
    
    // Format dates for the prompt
    const formattedStartDate = new Date(startDate).toLocaleDateString();
    const formattedEndDate = new Date(endDate).toLocaleDateString();
    
    // Create a comprehensive prompt for the AI
    const prompt = `
    Analisis keuangan untuk dompet "${wallet.name}" dari periode ${formattedStartDate} sampai ${formattedEndDate}.
    
    Data Keuangan:
    - Total Pendapatan: Rp ${data.totalIncome?.toLocaleString() || '0'}
    - Total Pengeluaran: Rp ${data.totalExpenses?.toLocaleString() || '0'}
    - Arus Kas Bersih: Rp ${data.netCashFlow?.toLocaleString() || '0'}
    
    ${data.topExpenseCategories ? `
    Kategori Pengeluaran Teratas:
    ${data.topExpenseCategories.map((cat: any) => 
      `- ${cat.name}: Rp ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`
    ).join('\n')}
    ` : ''}
    
    ${data.monthlyData ? `
    Data Bulanan:
    ${data.monthlyData.map((month: any) => 
      `- ${month.month}: Pendapatan Rp ${month.income.toLocaleString()}, Pengeluaran Rp ${month.expenses.toLocaleString()}, Net Rp ${month.net.toLocaleString()}`
    ).join('\n')}
    ` : ''}
    
    Berdasarkan data di atas, berikan analisis keuangan yang komprehensif dalam bahasa Jaksel Gaul, jangan ada kata kata "Jaksel"/kata kata norak yg diselipkan di kalimat. Analisis harus mencakup:
    1. Rangkuman keseluruhan situasi keuangan
    2. Identifikasi pola pengeluaran utama dan rekomendasi penghematan
    3. Tren pendapatan dan pengeluaran dari waktu ke waktu
    4. Rekomendasi perbaikan untuk meningkatkan kesehatan keuangan
    5. Prediksi untuk periode berikutnya jika pola saat ini berlanjut
    
    Berikan analisis dalam format paragraf terstruktur dan fokus pada wawasan praktis yang dapat ditindaklanjuti dan ingat pakai bahasa jaksel gaul.
    `;
    
    // Call the AI service to generate analysis
    const analysis = await generateAIResponse({
      prompt,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.selectedModel
    });
    
    return analysis;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return null;
  }
}

// Helper function to format markdown for PDF
function formatMarkdownForPDF(doc: any, text: string, startX: number, startY: number, pageWidth: number): number {
  if (!text) return startY;
  
  let currentY = startY;
  const lineHeight = 6; // Reduced line height
  const margin = 30; // Keep margin the same
  const effectiveWidth = pageWidth - 2 * margin - 20; // Additional buffer for safety
  
  // Pre-process the text to replace any asterisks (*) with dashes (-) for bullet points
  text = text.replace(/^\s*\*\s+/gm, '- ');
  
  // Also replace any stray # symbols that don't form part of a heading
  text = text.replace(/^#(?!\s)/gm, '');
  text = text.replace(/([^#])#/g, '$1');
  
  // Fix duplicate "Rekomendasi:" lines that might appear in the output
  text = text.replace(/Rekomendasi:\s*\n\s*Rekomendasi:/g, 'Rekomendasi:');
  
  // Split text into sections by headers
  const sections = text.split(/(?=##)/g);
  
  for (const section of sections) {
    if (section.trim() === '') continue;
    
    // Check if we need to add a new page
    if (currentY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      currentY = 20;
    }
    
    // Process each line in the section
    const lines = section.split('\n');
    let inList = false;
    let inNumberedList = false;
    let listItemCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line === '') {
        currentY += 3; // Reduced space for blank lines
        inList = false;
        inNumberedList = false;
        continue;
      }
      
      // Handle Headers
      if (line.startsWith('###')) {
        // Apply header styling
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11); // Reduced from 13
        
        // Remove the ### markers
        line = line.replace(/^###\s+/, '');
        
        // Check if we need to add a new page
        if (currentY > doc.internal.pageSize.height - 40) {
          doc.addPage();
          currentY = 20;
        }
        
        // Ensure text fits within the page width - reduce font size if needed
        const maxWidth = pageWidth - 2 * margin;
        const textWidth = doc.getTextWidth(line);
        if (textWidth > maxWidth && line.length > 30) {
          doc.setFontSize(10); // Reduced from 11
        }
        
        const textLines = doc.splitTextToSize(line, effectiveWidth);
        doc.text(textLines, startX, currentY);
        currentY += textLines.length * lineHeight + 4; // Reduced from 5
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10); // Reduced from 11
        continue;
      }
      
      // Handle subheaders or section titles
      if (line.startsWith('##')) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12); // Reduced from 14
        line = line.replace(/^##\s+/, '');
        
        // Check if we need to add a new page
        if (currentY > doc.internal.pageSize.height - 40) {
          doc.addPage();
          currentY = 20;
        }
        
        // Ensure text fits within the page width - reduce font size if needed
        const maxWidth = pageWidth - 2 * margin;
        const textWidth = doc.getTextWidth(line);
        if (textWidth > maxWidth && line.length > 25) {
          doc.setFontSize(11); // Reduced from 12
        }
        
        const textLines = doc.splitTextToSize(line, effectiveWidth);
        doc.text(textLines, startX, currentY);
        currentY += textLines.length * lineHeight + 4; // Reduced from 5
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10); // Reduced from 11
        continue;
      }
      
      // Handle main headers
      if (line.startsWith('#')) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14); // Reduced from 16
        line = line.replace(/^#\s+/, '');
        
        // Check if we need to add a new page
        if (currentY > doc.internal.pageSize.height - 40) {
          doc.addPage();
          currentY = 20;
        }
        
        // Ensure text fits within the page width - reduce font size if needed
        const maxWidth = pageWidth - 2 * margin;
        const textWidth = doc.getTextWidth(line);
        if (textWidth > maxWidth && line.length > 20) {
          doc.setFontSize(12); // Reduced from 14
        }
        
        const textLines = doc.splitTextToSize(line, effectiveWidth);
        doc.text(textLines, startX, currentY);
        currentY += textLines.length * lineHeight + 6; // Reduced from 8
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10); // Reduced from 11
        continue;
      }
      
      // Handle numbered lists (e.g., "1. Item")
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        const [, number, contentText] = numberedMatch;
        
        // Format text
        const formattedText = contentText.replace(/\*\*(.*?)\*\*/g, '$1');
        
        // Calculate available width - provide more space for the text
        // Use narrower width for bullet points to ensure proper wrapping
        const textX = startX + 8; // Reduced from 10
        const availableWidth = effectiveWidth - 10; // Reduced from 12
        
        // Split text to narrower width
        const textLines = doc.splitTextToSize(formattedText, availableWidth);
        
        // Check if we need to add a new page
        if (currentY + textLines.length * lineHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
        
        // Draw the number
        doc.setFont(undefined, 'bold');
        doc.text(`${number}.`, startX, currentY);
        doc.setFont(undefined, 'normal');
        
        // Check for bold text
        if (contentText.includes('**')) {
          let remainingText = contentText;
          let tempX = textX;
          
          // Process line by line for proper wrapping
          for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
            // Only the first line should be processed for bold tags, rest are already wrapped
            const currentLine = lineIndex === 0 ? remainingText : textLines[lineIndex];
            tempX = lineIndex === 0 ? textX : textX; // Reset X position for each new line
            
            if (lineIndex > 0) {
              currentY += lineHeight;
            }
            
            if (lineIndex === 0 && currentLine.includes('**')) {
              let tempLine = currentLine;
              
              while (tempLine.includes('**')) {
                const start = tempLine.indexOf('**');
                const firstPart = tempLine.substring(0, start);
                
                // Draw first part (non-bold)
                if (firstPart) {
                  doc.setFont(undefined, 'normal');
                  doc.text(firstPart, tempX, currentY);
                  tempX += doc.getTextWidth(firstPart);
                }
                
                // Find the bold part
                const restOfText = tempLine.substring(start + 2);
                const end = restOfText.indexOf('**');
                
                if (end !== -1) {
                  const boldText = restOfText.substring(0, end);
                  
                  // Draw bold part
                  doc.setFont(undefined, 'bold');
                  doc.text(boldText, tempX, currentY);
                  tempX += doc.getTextWidth(boldText);
                  
                  // Update remaining text
                  tempLine = restOfText.substring(end + 2);
                } else {
                  // No closing **, just draw the rest normally
                  doc.setFont(undefined, 'normal');
                  doc.text(tempLine.substring(2), tempX, currentY);
                  break;
                }
              }
              
              // Draw any remaining text
              if (tempLine && !tempLine.includes('**')) {
                doc.setFont(undefined, 'normal');
                doc.text(tempLine, tempX, currentY);
              }
            } else {
              // No bold text or not the first line
              doc.setFont(undefined, 'normal');
              doc.text(textLines[lineIndex], textX, currentY);
            }
          }
        } else {
          // No bold parts, just draw the text
          doc.text(textLines, textX, currentY);
        }
        
        currentY += textLines.length * lineHeight + 1; // Reduced from 2
        inNumberedList = true;
        inList = false;
        continue;
      }
      
      // Handle bullet points (- only, * should be pre-processed)
      if (line.startsWith('-')) {
        const bulletText = line.substring(1).trim();
        
        // Format bullet point text
        const formattedText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1'); // First get content of bold text
        
        // Calculate available width - provide more space for the text
        // Use narrower width for bullet points to ensure proper wrapping
        const tempX = startX + 7; // Reduced from 8
        const availableWidth = effectiveWidth - 10; // Reduced from 12
        
        // Split text to narrower width for better wrapping
        const textLines = doc.splitTextToSize(formattedText, availableWidth);
        
        // Check if we need to add a new page
        if (currentY + textLines.length * lineHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
        
        // Draw bullet
        doc.circle(startX + 2, currentY - 2, 0.8, 'F'); // Reduced circle size
        
        // Check for bold text
        if (bulletText.includes('**')) {
          let remainingText = bulletText;
          let xPos = tempX;
          
          // Process line by line for proper wrapping
          for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
            // Only the first line should be processed for bold tags, rest are already wrapped
            const currentLine = lineIndex === 0 ? remainingText : textLines[lineIndex];
            xPos = lineIndex === 0 ? tempX : tempX; // Reset X position for each new line
            
            if (lineIndex > 0) {
              currentY += lineHeight;
            }
            
            if (lineIndex === 0 && currentLine.includes('**')) {
              let tempLine = currentLine;
              
              while (tempLine.includes('**')) {
                const start = tempLine.indexOf('**');
                const firstPart = tempLine.substring(0, start);
                
                // Draw first part (non-bold)
                if (firstPart) {
                  doc.setFont(undefined, 'normal');
                  doc.text(firstPart, xPos, currentY);
                  xPos += doc.getTextWidth(firstPart);
                }
                
                // Find the bold part
                const restOfText = tempLine.substring(start + 2);
                const end = restOfText.indexOf('**');
                
                if (end !== -1) {
                  const boldText = restOfText.substring(0, end);
                  
                  // Draw bold part
                  doc.setFont(undefined, 'bold');
                  doc.text(boldText, xPos, currentY);
                  xPos += doc.getTextWidth(boldText);
                  
                  // Update remaining text
                  tempLine = restOfText.substring(end + 2);
                } else {
                  // No closing **, just draw the rest normally
                  doc.setFont(undefined, 'normal');
                  doc.text(tempLine.substring(2), xPos, currentY);
                  break;
                }
              }
              
              // Draw any remaining text
              if (tempLine && !tempLine.includes('**')) {
                doc.setFont(undefined, 'normal');
                doc.text(tempLine, xPos, currentY);
              }
            } else {
              // No bold text or not the first line
              doc.setFont(undefined, 'normal');
              doc.text(textLines[lineIndex], tempX, currentY);
            }
          }
        } else {
          // No bold parts, just draw the text with proper wrapping
          doc.text(textLines, tempX, currentY);
        }
        
        currentY += (textLines.length > 1 ? textLines.length * lineHeight : lineHeight) + 1; // Reduced from 2
        inList = true;
        inNumberedList = false;
        continue;
      }
      
      // Regular text paragraph
      if (inList || inNumberedList) {
        currentY += 1; // Reduced from 2
        inList = false;
        inNumberedList = false;
      }
      
      // Handle bold text
      if (line.includes('**')) {
        const normalizedLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
        const textLines = doc.splitTextToSize(normalizedLine, effectiveWidth);
        
        // Check if we need to add a new page
        if (currentY + textLines.length * lineHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
        
        // Process line by line for proper wrapping
        for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
          let tempX = startX;
          
          // Only first line may contain bold tags, others are already wrapped
          // without tags
          const tempLine = lineIndex === 0 ? line : textLines[lineIndex];
          
          if (lineIndex > 0) {
            currentY += lineHeight;
          }
          
          if (lineIndex === 0 && tempLine.includes('**')) {
            let processLine = tempLine;
            
            while (processLine.includes('**')) {
              const start = processLine.indexOf('**');
              const firstPart = processLine.substring(0, start);
              
              // Draw first part (non-bold)
              if (firstPart) {
                doc.setFont(undefined, 'normal');
                doc.text(firstPart, tempX, currentY);
                tempX += doc.getTextWidth(firstPart);
              }
              
              // Find the bold part
              const restOfText = processLine.substring(start + 2);
              const end = restOfText.indexOf('**');
              
              if (end !== -1) {
                const boldText = restOfText.substring(0, end);
                
                // Draw bold part
                doc.setFont(undefined, 'bold');
                doc.text(boldText, tempX, currentY);
                tempX += doc.getTextWidth(boldText);
                
                // Update remaining text
                processLine = restOfText.substring(end + 2);
              } else {
                // No closing **, just draw the rest normally
                doc.setFont(undefined, 'normal');
                doc.text(processLine.substring(2), tempX, currentY);
                break;
              }
            }
            
            // Draw any remaining text
            if (processLine && !processLine.includes('**')) {
              doc.setFont(undefined, 'normal');
              doc.text(processLine, tempX, currentY);
            }
          } else {
            // No bold text in this line or not the first line
            doc.setFont(undefined, 'normal');
            doc.text(textLines[lineIndex], startX, currentY);
          }
        }
        
        currentY += (textLines.length > 1 ? 1.5 : 1) * lineHeight + 1; // Reduced from 2
      } else if (line.trim() !== '') {
        // Regular text (no bold)
        const textLines = doc.splitTextToSize(line, effectiveWidth);
        
        // Check if we need to add a new page
        if (currentY + textLines.length * lineHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.text(textLines, startX, currentY);
        currentY += textLines.length * lineHeight + 1; // Reduced from 2
      }
    }
    
    // Add space between sections
    currentY += 4; // Reduced from 5
  }
  
  return currentY;
}

// Helper functions for file generation
async function generatePDF(data: any, reportType: string, startDate: string, endDate: string, wallet: any, aiAnalysis?: string | null): Promise<Buffer> {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    const formattedStartDate = new Date(startDate).toLocaleDateString();
    const formattedEndDate = new Date(endDate).toLocaleDateString();
    
    // Add title and basic info
    doc.setFontSize(16); // Reduced from 18
    if (reportType === 'all') {
      doc.text('Laporan Keuangan Lengkap', 105, 15, { align: 'center' });
    } else {
      doc.text(`${capitalize(reportType)} Report`, 105, 15, { align: 'center' });
    }
    
    doc.setFontSize(11); // Reduced from 12
    doc.text(`Wallet: ${wallet.name}`, 105, 25, { align: 'center' });
    doc.text(`Period: ${formattedStartDate} - ${formattedEndDate}`, 105, 32, { align: 'center' });
    
    // Add summary information
    doc.setFontSize(12); // Reduced from 14
    doc.text('Summary', 14, 45);
    
    doc.setFontSize(10); // Reduced from 11
    doc.text(`Total Income: Rp ${data.totalIncome?.toLocaleString() || '0'}`, 14, 55);
    doc.text(`Total Expenses: Rp ${data.totalExpenses?.toLocaleString() || '0'}`, 14, 62);
    doc.text(`Net Cash Flow: Rp ${data.netCashFlow?.toLocaleString() || '0'}`, 14, 69);
    
    let yPos = 85;
    let finalY;
    
    // Always add summary section if data is available
    if (data.topExpenseCategories && data.topExpenseCategories.length > 0) {
      doc.setFontSize(12); // Reduced from 14
      doc.text('Top Expense Categories', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Amount', '% of Total']],
        body: data.topExpenseCategories.map((category: any) => [
          category.name,
          `Rp ${category.amount.toLocaleString()}`,
          `${category.percentage.toFixed(1)}%`
        ]),
        margin: { top: 10 },
        styles: {
          fontSize: 9 // Added font size for tables
        }
      });
      
      finalY = (doc as any).lastAutoTable?.finalY;
      if (finalY) {
        yPos = finalY + 15;
      } else {
        yPos += 50;
      }
    }
    
    // Add transactions section if data is available and reportType is 'all' or 'transactions'
    if ((reportType === 'all' || reportType === 'transactions') && data.transactions && data.transactions.length > 0) {
      // Check if we need a new page
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12); // Reduced from 14
      doc.text('Transactions', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
        body: data.transactions.slice(0, 15).map((transaction: any) => [
          new Date(transaction.date).toLocaleDateString(),
          transaction.description,
          transaction.category?.name || 'Uncategorized',
          transaction.type === 'INCOME' ? 'Income' : 'Expense',
          `${transaction.type === 'INCOME' ? '+' : '-'} Rp ${transaction.amount.toLocaleString()}`
        ]),
        margin: { top: 10 },
        styles: {
          overflow: 'ellipsize',
          cellWidth: 'wrap',
          fontSize: 9 // Added font size for tables
        },
        columnStyles: {
          1: { cellWidth: 'auto' }
        }
      });
      
      finalY = (doc as any).lastAutoTable?.finalY;
      if (finalY) {
        yPos = finalY + 15;
      } else {
        yPos += 50;
      }
      
      // Add note if we're showing limited transactions
      if (data.transactions.length > 15) {
        doc.setFontSize(9); // Reduced from 10
        doc.setTextColor(100, 100, 100);
        doc.text(`Showing 15 of ${data.transactions.length} transactions`, 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }
    }
    
    // Add categories section if data is available and reportType is 'all' or 'categories'
    if ((reportType === 'all' || reportType === 'categories') && 
        (data.expenseCategories?.length > 0 || data.incomeCategories?.length > 0)) {
      // Check if we need a new page
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      if (data.expenseCategories && data.expenseCategories.length > 0) {
        doc.setFontSize(12); // Reduced from 14
        doc.text('Expense Categories', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Amount', '% of Total']],
          body: data.expenseCategories.map((category: any) => [
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ]),
          margin: { top: 10 },
          styles: {
            fontSize: 9 // Added font size for tables
          }
        });
        
        finalY = (doc as any).lastAutoTable?.finalY;
        if (finalY) {
          yPos = finalY + 15;
        } else {
          yPos += 50;
        }
      }
      
      if (data.incomeCategories && data.incomeCategories.length > 0) {
        // Check if we need a new page
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12); // Reduced from 14
        doc.text('Income Categories', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Amount', '% of Total']],
          body: data.incomeCategories.map((category: any) => [
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ]),
          margin: { top: 10 },
          styles: {
            fontSize: 9 // Added font size for tables
          }
        });
        
        finalY = (doc as any).lastAutoTable?.finalY;
        if (finalY) {
          yPos = finalY + 15;
        } else {
          yPos += 50;
        }
      }
    }
    
    // Add trends section if data is available and reportType is 'all' or 'trends'
    if ((reportType === 'all' || reportType === 'trends') && data.monthlyData && data.monthlyData.length > 0) {
      // Check if we need a new page
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12); // Reduced from 14
      doc.text('Monthly Cash Flow', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Month', 'Income', 'Expenses', 'Net']],
        body: data.monthlyData.map((month: any) => [
          month.month,
          `Rp ${month.income.toLocaleString()}`,
          `Rp ${month.expenses.toLocaleString()}`,
          `Rp ${month.net.toLocaleString()}`
        ]),
        margin: { top: 10 },
        styles: {
          fontSize: 9 // Added font size for tables
        }
      });
      
      finalY = (doc as any).lastAutoTable?.finalY;
      if (finalY) {
        yPos = finalY + 15;
      } else {
        yPos += 50;
      }
    }
    
    // Add AI Analysis section if available
    if (aiAnalysis) {
      // Always start AI analysis on a new page
      doc.addPage();
      
      doc.setFontSize(14);
      doc.text('AI Analysis', 105, 15, { align: 'center' });
      
      // Extract the title of the analysis (first line) to display separately
      let title = '';
      let analysisContent = aiAnalysis;
      
      // Try to extract the first line as title if it doesn't start with a number
      const lines = aiAnalysis.split('\n');
      if (lines.length > 0 && !lines[0].match(/^\d+\./)) {
        title = lines[0].replace(/^#+\s*/, '').trim();
        analysisContent = lines.slice(1).join('\n').trim();
      }
      
      // Display the title if found
      if (title) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, 25);
        doc.setFont('helvetica', 'normal');
      }
      
      // Create a simpler table with just numbered sections
      autoTable(doc, {
        startY: title ? 30 : 25,
        margin: { left: 10, right: 10 },
        tableWidth: doc.internal.pageSize.getWidth() - 20,
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          font: 'helvetica',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'normal' }
        },
        columns: [
          { header: '', dataKey: 'number' },
          { header: '', dataKey: 'content' }
        ],
        body: extractNumberedSections(aiAnalysis).map(section => ({
          number: section.number + '.',
          content: section.content
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/^\s*-\s+/gm, '• ')
        })),
        didParseCell: function(data) {
          // Ensure second column takes up appropriate width
          if (data.column.index === 1) {
            data.cell.styles.cellWidth = doc.internal.pageSize.getWidth() - 35;
            data.cell.styles.fontStyle = 'normal'; // Ensure content column is always normal
          }
        },
        willDrawCell: function(data) {
          // Only the numbers in column 0 should be bold, already handled by columnStyles
          if (data.column.index === 0) {
            doc.setFont('helvetica', 'bold');
          } else if (data.column.index === 1) {
            // Ensure content in column 1 is always normal
            doc.setFont('helvetica', 'normal');
          }
        },
        didDrawCell: function(data) {
          // Reset font after each cell
          doc.setFont('helvetica', 'normal');
        }
      });
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(7); // Reduced from 8
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Generated by BudTrack - ${new Date().toLocaleString()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        195,
        doc.internal.pageSize.height - 10,
        { align: 'right' }
      );
    }
    
    // Convert to PDF buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to CSV as a last resort
    return generateCSV(data, reportType, `${reportType.toUpperCase()} Report - PDF generation failed, CSV provided instead`);
  }
}

function generateExcel(data: any, reportType: string): Buffer {
  const workbook = XLSX.utils.book_new()
  
  switch (reportType) {
    case 'summary': {
      // Summary sheet
      const summaryData = [
        ['Summary Report'],
        [''],
        ['Total Income', `Rp ${data.totalIncome?.toLocaleString() || '0'}`],
        ['Total Expenses', `Rp ${data.totalExpenses?.toLocaleString() || '0'}`],
        ['Net Cash Flow', `Rp ${data.netCashFlow?.toLocaleString() || '0'}`],
        [''],
        ['Top Expense Categories'],
        ['Category', 'Amount', '% of Total']
      ]
      
      if (data.topExpenseCategories && data.topExpenseCategories.length > 0) {
        data.topExpenseCategories.forEach((category: any) => {
          summaryData.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ])
        })
      }
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
      break
    }
    
    case 'transactions': {
      // Transactions sheet
      const transactionsData = [
        ['Transactions Report'],
        [''],
        ['Date', 'Description', 'Category', 'Type', 'Amount']
      ]
      
      if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach((transaction: any) => {
          transactionsData.push([
            new Date(transaction.date).toLocaleDateString(),
            transaction.description,
            transaction.category?.name || 'Uncategorized',
            transaction.type === 'INCOME' ? 'Income' : 'Expense',
            `${transaction.type === 'INCOME' ? '+' : '-'} Rp ${transaction.amount.toLocaleString()}`
          ])
        })
      }
      
      const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData)
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')
      break
    }
    
    case 'categories': {
      // Expense Categories sheet
      const expenseCategoriesData = [
        ['Expense Categories Report'],
        [''],
        ['Category', 'Amount', '% of Total']
      ]
      
      if (data.expenseCategories && data.expenseCategories.length > 0) {
        data.expenseCategories.forEach((category: any) => {
          expenseCategoriesData.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ])
        })
      }
      
      const expenseCategoriesSheet = XLSX.utils.aoa_to_sheet(expenseCategoriesData)
      XLSX.utils.book_append_sheet(workbook, expenseCategoriesSheet, 'Expense Categories')
      
      // Income Categories sheet
      const incomeCategoriesData = [
        ['Income Categories Report'],
        [''],
        ['Category', 'Amount', '% of Total']
      ]
      
      if (data.incomeCategories && data.incomeCategories.length > 0) {
        data.incomeCategories.forEach((category: any) => {
          incomeCategoriesData.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ])
        })
      }
      
      const incomeCategoriesSheet = XLSX.utils.aoa_to_sheet(incomeCategoriesData)
      XLSX.utils.book_append_sheet(workbook, incomeCategoriesSheet, 'Income Categories')
      break
    }
    
    case 'trends': {
      // Monthly Trends sheet
      const trendData = [
        ['Monthly Trends Report'],
        [''],
        ['Month', 'Income', 'Expenses', 'Net']
      ]
      
      if (data.monthlyData && data.monthlyData.length > 0) {
        data.monthlyData.forEach((month: any) => {
          trendData.push([
            month.month,
            `Rp ${month.income.toLocaleString()}`,
            `Rp ${month.expenses.toLocaleString()}`,
            `Rp ${month.net.toLocaleString()}`
          ])
        })
      }
      
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData)
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Monthly Trends')
      break
    }
  }
  
  // Write to buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

// Helper function to escape CSV field values
function escapeCSV(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringValue = String(field);
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Double up any quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function generateCSV(data: any, reportType: string, headerNote?: string): Buffer {
  let rows: string[][] = []
  
  // Add a header note if provided (e.g., for PDF fallback)
  if (headerNote) {
    rows.push([headerNote]);
    rows.push([]);
  }
  
  switch (reportType) {
    case 'summary':
      rows.push(['Summary Report']);
      rows.push([]);
      rows.push(['Total Income', `Rp ${data.totalIncome?.toLocaleString() || '0'}`]);
      rows.push(['Total Expenses', `Rp ${data.totalExpenses?.toLocaleString() || '0'}`]);
      rows.push(['Net Cash Flow', `Rp ${data.netCashFlow?.toLocaleString() || '0'}`]);
      rows.push([]);
      rows.push(['Top Expense Categories']);
      rows.push(['Category', 'Amount', '% of Total']);
      
      if (data.topExpenseCategories && data.topExpenseCategories.length > 0) {
        data.topExpenseCategories.forEach((category: any) => {
          rows.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ]);
        });
      }
      break;
      
    case 'transactions':
      rows.push(['Transactions Report']);
      rows.push([]);
      rows.push(['Date', 'Description', 'Category', 'Type', 'Amount']);
      
      if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach((transaction: any) => {
          rows.push([
            new Date(transaction.date).toLocaleDateString(),
            transaction.description,
            transaction.category?.name || 'Uncategorized',
            transaction.type === 'INCOME' ? 'Income' : 'Expense',
            `${transaction.type === 'INCOME' ? '+' : '-'} Rp ${transaction.amount.toLocaleString()}`
          ]);
        });
      }
      break;
      
    case 'categories':
      rows.push(['Categories Report']);
      rows.push([]);
      rows.push(['Expense Categories']);
      rows.push(['Category', 'Amount', '% of Total']);
      
      if (data.expenseCategories && data.expenseCategories.length > 0) {
        data.expenseCategories.forEach((category: any) => {
          rows.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ]);
        });
      }
      
      rows.push([]);
      rows.push(['Income Categories']);
      rows.push(['Category', 'Amount', '% of Total']);
      
      if (data.incomeCategories && data.incomeCategories.length > 0) {
        data.incomeCategories.forEach((category: any) => {
          rows.push([
            category.name,
            `Rp ${category.amount.toLocaleString()}`,
            `${category.percentage.toFixed(1)}%`
          ]);
        });
      }
      break;
      
    case 'trends':
      rows.push(['Trends Report']);
      rows.push([]);
      rows.push(['Month', 'Income', 'Expenses', 'Net']);
      
      if (data.monthlyData && data.monthlyData.length > 0) {
        data.monthlyData.forEach((month: any) => {
          rows.push([
            month.month,
            `Rp ${month.income.toLocaleString()}`,
            `Rp ${month.expenses.toLocaleString()}`,
            `Rp ${month.net.toLocaleString()}`
          ]);
        });
      }
      break;
  }
  
  // Convert to properly escaped CSV with BOM for Excel compatibility
  const csv = rows.map(row => row.map(field => escapeCSV(field)).join(',')).join('\r\n');
  const BOM = '\uFEFF'; // Add BOM for proper UTF-8 recognition in Excel
  return Buffer.from(BOM + csv, 'utf-8');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Helper function to extract numbered sections from AI analysis
function extractNumberedSections(text: string): Array<{number: string, content: string}> {
  const sectionsRegex = /(\d+)\.?\s+(.*?)(?=\n\d+\.|\n*$)/g;
  const sections: Array<{number: string, content: string}> = [];
  let match;
  
  // Try to extract numbered sections
  while ((match = sectionsRegex.exec(text)) !== null) {
    const [, number, content] = match;
    // Manually break lines that are too long
    const processedContent = breakLongLines(content.trim(), 100);
    sections.push({ number, content: processedContent });
  }
  
  // If no sections were found, use the whole text
  if (sections.length === 0) {
    sections.push({ number: '', content: breakLongLines(text, 100) });
  }
  
  return sections;
}

// Function to break long lines
function breakLongLines(text: string, maxLength: number = 100): string {
  const lines = text.split('\n');
  const result: string[] = [];
  
  lines.forEach(line => {
    if (line.length <= maxLength) {
      result.push(line);
    } else {
      // Break long lines at appropriate points
      let currentPos = 0;
      while (currentPos < line.length) {
        let breakPoint = currentPos + maxLength;
        
        if (breakPoint < line.length) {
          // Look for a space to break at
          const spacePos = line.lastIndexOf(' ', breakPoint);
          if (spacePos > currentPos && spacePos - currentPos >= 20) {
            breakPoint = spacePos;
          }
        } else {
          breakPoint = line.length;
        }
        
        result.push(line.substring(currentPos, breakPoint).trim());
        currentPos = breakPoint + (line[breakPoint] === ' ' ? 1 : 0);
      }
    }
  });
  
  return result.join('\n');
} 