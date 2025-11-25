/**
 * Bank Statement Parser
 * Supports multiple bank formats (BCA, Mandiri, BRI, BNI, etc.)
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  balance?: number;
  reference?: string;
}

export interface BankFormat {
  name: string;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  balanceColumn?: string;
  dateFormat: string;
  skipRows?: number;
}

// Predefined bank formats
export const BANK_FORMATS: Record<string, BankFormat> = {
  BCA: {
    name: 'BCA',
    dateColumn: 'Tanggal',
    descriptionColumn: 'Keterangan',
    debitColumn: 'Mutasi Debit',
    creditColumn: 'Mutasi Kredit',
    balanceColumn: 'Saldo',
    dateFormat: 'DD/MM/YYYY',
    skipRows: 1,
  },
  MANDIRI: {
    name: 'Mandiri',
    dateColumn: 'Tanggal',
    descriptionColumn: 'Keterangan',
    amountColumn: 'Nominal',
    balanceColumn: 'Saldo',
    dateFormat: 'DD/MM/YYYY',
  },
  BRI: {
    name: 'BRI',
    dateColumn: 'Tanggal',
    descriptionColumn: 'Deskripsi',
    debitColumn: 'Debet',
    creditColumn: 'Kredit',
    balanceColumn: 'Saldo',
    dateFormat: 'DD-MM-YYYY',
  },
  BNI: {
    name: 'BNI',
    dateColumn: 'Tanggal',
    descriptionColumn: 'Keterangan',
    debitColumn: 'Debit',
    creditColumn: 'Kredit',
    balanceColumn: 'Saldo',
    dateFormat: 'DD/MM/YYYY',
  },
  GENERIC: {
    name: 'Generic',
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
  },
};

/**
 * Parse CSV content to transactions
 */
export function parseBankStatement(
  csvContent: string,
  bankFormat: BankFormat
): ParsedTransaction[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Skip header rows
  const startIndex = bankFormat.skipRows || 0;
  const headerLine = lines[startIndex];
  const headers = parseCSVLine(headerLine);

  // Find column indices
  const dateIndex = findColumnIndex(headers, bankFormat.dateColumn);
  const descIndex = findColumnIndex(headers, bankFormat.descriptionColumn);
  
  let amountIndex = -1;
  let debitIndex = -1;
  let creditIndex = -1;
  let balanceIndex = -1;

  if (bankFormat.amountColumn) {
    amountIndex = findColumnIndex(headers, bankFormat.amountColumn);
  }
  if (bankFormat.debitColumn) {
    debitIndex = findColumnIndex(headers, bankFormat.debitColumn);
  }
  if (bankFormat.creditColumn) {
    creditIndex = findColumnIndex(headers, bankFormat.creditColumn);
  }
  if (bankFormat.balanceColumn) {
    balanceIndex = findColumnIndex(headers, bankFormat.balanceColumn);
  }

  if (dateIndex === -1 || descIndex === -1) {
    throw new Error('Required columns not found in CSV');
  }

  // Parse data rows
  const transactions: ParsedTransaction[] = [];
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const columns = parseCSVLine(line);
      
      // Parse date
      const dateStr = columns[dateIndex]?.trim();
      if (!dateStr) continue;
      
      const date = parseDate(dateStr, bankFormat.dateFormat);
      if (!date) continue;

      // Parse description
      const description = columns[descIndex]?.trim() || 'Unknown';

      // Parse amount and type
      let amount = 0;
      let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';

      if (amountIndex !== -1) {
        // Single amount column
        const amountStr = columns[amountIndex]?.trim();
        amount = parseAmount(amountStr);
        // Determine type based on sign or description
        type = amount < 0 ? 'EXPENSE' : 'INCOME';
        amount = Math.abs(amount);
      } else if (debitIndex !== -1 && creditIndex !== -1) {
        // Separate debit/credit columns
        const debitStr = columns[debitIndex]?.trim();
        const creditStr = columns[creditIndex]?.trim();
        
        const debit = parseAmount(debitStr);
        const credit = parseAmount(creditStr);

        if (debit > 0) {
          amount = debit;
          type = 'EXPENSE';
        } else if (credit > 0) {
          amount = credit;
          type = 'INCOME';
        } else {
          continue; // Skip if both are zero
        }
      }

      if (amount === 0) continue;

      // Parse balance (optional)
      let balance: number | undefined;
      if (balanceIndex !== -1) {
        const balanceStr = columns[balanceIndex]?.trim();
        balance = parseAmount(balanceStr);
      }

      transactions.push({
        date,
        description,
        amount,
        type,
        balance,
      });
    } catch (error) {
      console.error(`Error parsing line ${i}:`, error);
      // Continue with next line
    }
  }

  return transactions;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Find column index by name (case-insensitive)
 */
function findColumnIndex(headers: string[], columnName: string): number {
  const normalized = columnName.toLowerCase();
  return headers.findIndex(h => h.toLowerCase().includes(normalized));
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string, format: string): Date | null {
  try {
    // Remove quotes
    dateStr = dateStr.replace(/"/g, '').trim();

    // Handle different formats
    if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
      const separator = format.includes('/') ? '/' : '-';
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    } else if (format === 'YYYY-MM-DD') {
      return new Date(dateStr);
    }

    // Fallback: try to parse as-is
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string | undefined): number {
  if (!amountStr) return 0;

  // Remove quotes, spaces, currency symbols
  let cleaned = amountStr
    .replace(/"/g, '')
    .replace(/\s/g, '')
    .replace(/Rp/gi, '')
    .replace(/IDR/gi, '')
    .trim();

  // Handle negative amounts
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
  cleaned = cleaned.replace(/[()]/g, '').replace(/-/g, '');

  // Remove thousand separators (dots or commas)
  // Assume last separator is decimal
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot > lastComma) {
    // Dot is decimal separator
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    // Comma is decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // No decimal separator, remove all
    cleaned = cleaned.replace(/[.,]/g, '');
  }

  const amount = parseFloat(cleaned) || 0;
  return isNegative ? -amount : amount;
}

/**
 * Auto-detect bank format from CSV content
 */
export function detectBankFormat(csvContent: string): BankFormat | null {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return null;

  const headerLine = lines[0].toLowerCase();

  // Check for bank-specific patterns
  if (headerLine.includes('bca') || headerLine.includes('mutasi debit')) {
    return BANK_FORMATS.BCA;
  }
  if (headerLine.includes('mandiri')) {
    return BANK_FORMATS.MANDIRI;
  }
  if (headerLine.includes('bri') || headerLine.includes('debet')) {
    return BANK_FORMATS.BRI;
  }
  if (headerLine.includes('bni')) {
    return BANK_FORMATS.BNI;
  }

  // Default to generic format
  return BANK_FORMATS.GENERIC;
}
