'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@/app/providers/WalletProvider'
import WalletSelector from '@/app/components/WalletSelector'

export default function DebugSummaryPage() {
    const { selectedWallet } = useWallet()
    const [transactions, setTransactions] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState('year')
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')

    useEffect(() => {
        if (selectedWallet) {
            fetchData()
        }
    }, [selectedWallet, period, type])

    const fetchData = async () => {
        if (!selectedWallet) return
        setLoading(true)
        try {
            const res = await fetch('/api/debug/summary-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId: selectedWallet.id,
                    period,
                    type
                })
            })
            const data = await res.json()
            setTransactions(data.transactions)
            setTotal(data.totalAmount)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Debug Summary Data</h1>

            <div className="mb-6">
                <WalletSelector />
            </div>

            <div className="flex gap-4 mb-6">
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME')}
                    className="border p-2 rounded"
                >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                </select>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="border p-2 rounded"
                >
                    <option value="month">Bulan Ini</option>
                    <option value="year">Tahun Ini</option>
                </select>
                <button
                    onClick={fetchData}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Refresh Data
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-2">Total Calculated: {formatCurrency(total)}</h2>
                <p className="text-sm text-gray-500">
                    Ini adalah total dari SEMUA transaksi {type} di bawah ini (tanpa filter kategori).
                </p>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(tx.date).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {tx.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            {tx.category?.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                        {formatCurrency(tx.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
