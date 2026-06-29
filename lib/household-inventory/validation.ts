import { z } from 'zod'

const optionalId = z.string().min(1).optional().nullable()
const optionalTrimmed = z.string().trim().min(1).optional().nullable()

export const householdItemCreateSchema = z.object({
  name: z.string().trim().min(1),
  barcode: optionalTrimmed,
  categoryId: optionalId,
  locationId: optionalId,
  quantity: z.coerce.number().min(0),
  unit: z.string().trim().min(1),
  minimumQuantity: z.coerce.number().min(0),
  expiredAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().optional().nullable()
})

export const householdItemUpdateSchema = householdItemCreateSchema.partial()

export const adjustItemSchema = z.object({
  mode: z.enum(['ADD', 'SUBTRACT', 'SET']),
  quantity: z.coerce.number().min(0),
  reason: z.enum(['RESTOCK', 'USED', 'EXPIRED', 'DAMAGED', 'AUDIT', 'SHOPPING_LIST_RESTOCK']),
  note: z.string().trim().optional().nullable()
})

export const opnameSchema = z.object({
  updates: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.coerce.number().min(0)
  })).min(1)
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable()
})

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1)
})

export const barcodeLookupSchema = z.object({
  barcode: z.string().trim().min(3).max(64)
})

export const shoppingListItemCreateSchema = z.object({
  itemId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1),
  unit: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().min(0).optional().nullable()
})

export const shoppingRestockSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    boughtQuantity: z.coerce.number().positive()
  })).min(1)
})
