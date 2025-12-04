import type {
  AllocationTemplate,
  AllocationTemplateType,
  AllocationCategoryTemplate,
} from '@/app/types/allocation';

/**
 * Preset allocation templates
 */
const TEMPLATES: Record<Exclude<AllocationTemplateType, 'custom'>, AllocationTemplate> = {
  '50-30-20': {
    id: '50-30-20',
    name: '50/30/20 Rule',
    description: 'Aturan klasik: 50% kebutuhan, 30% keinginan, 20% tabungan',
    categories: [
      { name: 'Kebutuhan', type: 'needs', percentage: 50, icon: '🏠', color: '#3B82F6' },
      { name: 'Keinginan', type: 'wants', percentage: 30, icon: '🎮', color: '#8B5CF6' },
      { name: 'Tabungan', type: 'savings', percentage: 20, icon: '💰', color: '#10B981' },
    ],
  },
  '70-20-10': {
    id: '70-20-10',
    name: '70/20/10 Rule',
    description: 'Konservatif: 70% kebutuhan, 20% tabungan, 10% keinginan',
    categories: [
      { name: 'Kebutuhan', type: 'needs', percentage: 70, icon: '🏠', color: '#3B82F6' },
      { name: 'Tabungan', type: 'savings', percentage: 20, icon: '💰', color: '#10B981' },
      { name: 'Keinginan', type: 'wants', percentage: 10, icon: '🎮', color: '#8B5CF6' },
    ],
  },
};

/**
 * Default custom template structure
 */
const CUSTOM_TEMPLATE: AllocationTemplate = {
  id: 'custom',
  name: 'Custom',
  description: 'Buat alokasi sesuai kebutuhan kamu',
  categories: [
    { name: 'Makan', type: 'needs', percentage: 25, icon: '🍽️', color: '#F59E0B' },
    { name: 'Transport', type: 'needs', percentage: 15, icon: '🚗', color: '#6366F1' },
    { name: 'Tagihan', type: 'needs', percentage: 20, icon: '📄', color: '#EF4444' },
    { name: 'Hiburan', type: 'wants', percentage: 10, icon: '🎬', color: '#EC4899' },
    { name: 'Tabungan', type: 'savings', percentage: 20, icon: '💰', color: '#10B981' },
    { name: 'Lainnya', type: 'wants', percentage: 10, icon: '📦', color: '#6B7280' },
  ],
};

/**
 * TemplateService - Manages preset allocation templates
 */
export class TemplateService {
  /**
   * Get a specific template by type
   */
  getTemplate(type: AllocationTemplateType): AllocationTemplate {
    if (type === 'custom') {
      return { ...CUSTOM_TEMPLATE };
    }
    return { ...TEMPLATES[type] };
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): AllocationTemplate[] {
    return [
      { ...TEMPLATES['50-30-20'] },
      { ...TEMPLATES['70-20-10'] },
      { ...CUSTOM_TEMPLATE },
    ];
  }

  /**
   * Get template categories for calculation
   */
  getTemplateCategories(type: AllocationTemplateType): AllocationCategoryTemplate[] {
    const template = this.getTemplate(type);
    return template.categories.map((cat) => ({ ...cat }));
  }

  /**
   * Validate that a template type is valid
   */
  isValidTemplateType(type: string): type is AllocationTemplateType {
    return type === '50-30-20' || type === '70-20-10' || type === 'custom';
  }
}

// Export singleton instance
export const templateService = new TemplateService();
