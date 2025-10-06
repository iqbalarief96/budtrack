'use client'

import React from 'react'
import ComparativeSummaryCard from './ComparativeSummaryCard'

interface SummaryWidgetProps {
  walletId?: string
}

// This is a wrapper component for ComparativeSummaryCard to be used as a widget
export default function SummaryWidget({ walletId }: SummaryWidgetProps) {
  return <ComparativeSummaryCard />
} 