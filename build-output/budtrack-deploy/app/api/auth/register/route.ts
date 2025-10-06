import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Semua bidang harus diisi' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email sudah terdaftar' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await hash(password, 10)
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    // Create default wallet
    await prisma.wallet.create({
      data: {
        name: 'Dompet Utama',
        balance: 0,
        isDefault: true,
        userId: user.id
      }
    })

    // Create default categories
    const defaultCategories = [
      { name: 'Makanan', type: 'EXPENSE', color: '#F44336' },
      { name: 'Transportasi', type: 'EXPENSE', color: '#FF9800' },
      { name: 'Hiburan', type: 'EXPENSE', color: '#9C27B0' },
      { name: 'Belanja', type: 'EXPENSE', color: '#4CAF50' },
      { name: 'Tagihan', type: 'EXPENSE', color: '#2196F3' },
      { name: 'Kebutuhan', type: 'EXPENSE', color: '#607D8B' },
      { name: 'Gaji', type: 'INCOME', color: '#4CAF50' },
      { name: 'Bonus', type: 'INCOME', color: '#8BC34A' },
      { name: 'Hadiah', type: 'INCOME', color: '#CDDC39' },
      { name: 'Pendapatan Lain', type: 'INCOME', color: '#009688' },
    ]

    for (const category of defaultCategories) {
      await prisma.category.create({
        data: {
          name: category.name,
          type: category.type,
          color: category.color,
          userId: user.id
        }
      })
    }

    return NextResponse.json(
      { message: 'Pengguna berhasil didaftarkan' },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat pendaftaran' },
      { status: 500 }
    )
  }
} 