import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Export group data as CSV
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.groupId
    
    // Create sample CSV data
    // In a real implementation, you would fetch actual data from your database
    const csvContent = `Wallet Name,Date,Description,Amount,Category
"Family Budget","2023-01-01","Groceries","-120000","Food"
"Family Budget","2023-01-05","Salary","5000000","Income"
"Family Budget","2023-01-10","Internet Bill","-350000","Utilities"
"Trip Fund","2023-01-15","Hotel Booking","-1200000","Travel"
"Trip Fund","2023-01-20","Friend contribution","600000","Income"
"Emergency Fund","2023-01-25","Medical supplies","-75000","Health"`
    
    // Return CSV as response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="group-${groupId}-export.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting group data:', error)
    return NextResponse.json({ error: 'Failed to export group data' }, { status: 500 })
  }
} 