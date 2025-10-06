'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Users } from 'lucide-react'

export default function GroupWalletSettingsPage({ params }: { params: { groupId: string; walletId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Fungsi untuk navigasi ke tab Members
  const goToMembersTab = () => {
    router.push(`/groups/${params.groupId}/wallets/${params.walletId}?tab=members`);
  };

  if (!session) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please sign in to access this page
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6 space-x-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/groups/${params.groupId}/wallets/${params.walletId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wallet
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Wallet Settings</h1>
      </div>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Group Settings</CardTitle>
            <CardDescription>Manage your group settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Member Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can manage members from the Members tab. Here you can:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Promote members to Admin role</li>
                  <li>Demote admins to regular members</li>
                  <li>Remove members from the group</li>
                </ul>
                <div className="mt-4">
                  <Button onClick={goToMembersTab}>
                    <Users className="h-4 w-4 mr-2" />
                    Go to Members Tab
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 