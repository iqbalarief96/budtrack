import type {
  SalaryAllocationConfig,
  AllocationExportData,
  AllocationTemplateType,
} from '@/app/types/allocation';

const CURRENT_VERSION = '1.0';

/**
 * AllocationSerializer - Handles export/import of allocation configurations
 */
export class AllocationSerializer {
  /**
   * Serialize a configuration to JSON string
   */
  serialize(config: SalaryAllocationConfig): string {
    const exportData: AllocationExportData = {
      version: CURRENT_VERSION,
      name: config.name,
      templateType: config.templateType,
      items: config.items.map((item) => ({
        categoryName: item.categoryName,
        categoryType: item.categoryType,
        percentage: item.percentage,
        icon: item.icon || undefined,
        color: item.color || undefined,
      })),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Deserialize JSON string to AllocationExportData
   * Throws error if JSON is invalid or missing required fields
   */
  deserialize(json: string): AllocationExportData {
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Format JSON tidak valid');
    }

    // Validate required fields
    if (!this.isValidExportData(parsed)) {
      throw new Error('Data konfigurasi tidak lengkap atau tidak valid');
    }

    return parsed;
  }

  /**
   * Pretty print the parsed data for user verification
   */
  prettyPrint(data: AllocationExportData): string {
    const lines: string[] = [
      `📋 Konfigurasi: ${data.name}`,
      `📅 Diekspor: ${new Date(data.exportedAt).toLocaleDateString('id-ID')}`,
      `🏷️ Template: ${this.formatTemplateType(data.templateType)}`,
      '',
      '📊 Alokasi:',
    ];

    for (const item of data.items) {
      const icon = item.icon || '•';
      lines.push(`  ${icon} ${item.categoryName}: ${item.percentage}%`);
    }

    const totalPercentage = data.items.reduce((sum, item) => sum + item.percentage, 0);
    lines.push('');
    lines.push(`📈 Total: ${totalPercentage}%`);

    if (totalPercentage < 100) {
      lines.push(`⚠️ Belum dialokasikan: ${100 - totalPercentage}%`);
    }

    return lines.join('\n');
  }

  /**
   * Validate that parsed data has all required fields
   */
  private isValidExportData(data: unknown): data is AllocationExportData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check required string fields
    if (typeof obj.version !== 'string') return false;
    if (typeof obj.name !== 'string') return false;
    if (typeof obj.templateType !== 'string') return false;
    if (typeof obj.exportedAt !== 'string') return false;

    // Validate templateType
    if (!this.isValidTemplateType(obj.templateType)) return false;

    // Check items array
    if (!Array.isArray(obj.items)) return false;

    // Validate each item
    for (const item of obj.items) {
      if (typeof item !== 'object' || item === null) return false;
      if (typeof item.categoryName !== 'string') return false;
      if (typeof item.categoryType !== 'string') return false;
      if (typeof item.percentage !== 'number') return false;
      if (!['needs', 'wants', 'savings'].includes(item.categoryType)) return false;
    }

    return true;
  }

  /**
   * Check if template type is valid
   */
  private isValidTemplateType(type: string): type is AllocationTemplateType {
    return type === '50-30-20' || type === '70-20-10' || type === 'custom';
  }

  /**
   * Format template type for display
   */
  private formatTemplateType(type: AllocationTemplateType): string {
    switch (type) {
      case '50-30-20':
        return '50/30/20 Rule';
      case '70-20-10':
        return '70/20/10 Rule';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  }
}

// Export singleton instance
export const allocationSerializer = new AllocationSerializer();
