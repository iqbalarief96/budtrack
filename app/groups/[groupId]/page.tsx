'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Card, CardContent, CardDescription, 
  CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Wallet2, BarChart3, Settings, Copy,
  UserPlus, ArrowLeft, Plus, Share2
} from 'lucide-react'
import Link from 'next/link'

interface GroupData {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  ownerId: string
  members: GroupMember[]
  invites: GroupInvite[]
  _count?: {
    members: number
    wallets: number
  }
}

interface GroupMember {
  id: string
  userId: string
  groupId: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

interface GroupInvite {
  id: string
  code: string
  expiresAt: string
  isUsed: boolean
}

interface GroupWallet {
  id: string
  name: string
  balance: number
  currencyCode: string
  color: string | null
  icon: string | null
}

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<GroupData | null>(null)
  const [wallets, setWallets] = useState<GroupWallet[]>([])
  const [showCreateWalletDialog, setShowCreateWalletDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeInvite, setActiveInvite] = useState<GroupInvite | null>(null)
  const [walletFormData, setWalletFormData] = useState({
    name: '',
    currencyCode: 'IDR',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) {
      loadGroupData()
    }
  }, [session, params.groupId])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      
      // Fetch group data
      const groupResponse = await fetch(`/api/groups?includeMembers=true`)
      if (groupResponse.ok) {
        const groups = await groupResponse.json()
        const currentGroup = groups.find((g: any) => g.id === params.groupId)
        
        if (currentGroup) {
          setGroup(currentGroup)
          
          // Get active invites
          const invitesResponse = await fetch(`/api/groups/${params.groupId}/invites`)
          if (invitesResponse.ok) {
            const invites = await invitesResponse.json()
            const activeInvite = invites.find((inv: GroupInvite) => 
              !inv.isUsed && new Date(inv.expiresAt) > new Date()
            )
            if (activeInvite) {
              setActiveInvite(activeInvite)
            }
          }
          
          // Get wallets
          const walletsResponse = await fetch(`/api/groups/${params.groupId}/wallets`)
          if (walletsResponse.ok) {
            const walletsData = await walletsResponse.json()
            setWallets(walletsData)
          }
        } else {
          // Group not found or user doesn't have access
          router.push('/groups')
          toast({
            title: 'Access Denied',
            description: 'You do not have access to this group',
            variant: 'destructive',
          })
        }
      } else {
        router.push('/groups')
        toast({
          title: 'Error',
          description: 'Failed to load group data',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error loading group data:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while loading group data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/groups/${params.groupId}/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(walletFormData),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Wallet Created',
          description: `Wallet "${data.name}" has been created successfully`,
        })
        setWalletFormData({ name: '', currencyCode: 'IDR' })
        setShowCreateWalletDialog(false)
        setWallets([...wallets, data])
      } else {
        toast({
          title: 'Failed to create wallet',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating wallet:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while creating the wallet',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const createNewInvite = async () => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/groups/${params.groupId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresInDays: 7 }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setActiveInvite(data)
        toast({
          title: 'New invite created',
          description: 'A new invite code has been generated',
        })
      } else {
        toast({
          title: 'Failed to create invite',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating invite:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while creating the invite',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyInviteCode = () => {
    if (activeInvite) {
      navigator.clipboard.writeText(activeInvite.code)
      toast({
        title: 'Copied!',
        description: 'Invite code copied to clipboard'
      })
    }
  }

  const formatCurrency = (amount: number, currencyCode = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!session) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Access Required</h1>
        <p>You need to be logged in to view this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Loading...</h1>
        <p>Please wait while we load the group data.</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Group Not Found</h1>
        <p>The group you are looking for does not exist or you do not have access.</p>
        <Button asChild className="mt-4">
          <Link href="/groups">Back to Groups</Link>
        </Button>
      </div>
    )
  }

  const isOwner = group.ownerId === session.user.id
  const userRole = group.members.find(m => m.userId === session.user.id)?.role || 'MEMBER'
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/groups">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <Badge variant={isOwner ? "default" : "outline"} className="ml-2">
          {userRole === 'OWNER' ? 'Owner' : userRole === 'ADMIN' ? 'Admin' : 'Member'}
        </Badge>
      </div>

      {group.description && (
        <p className="text-muted-foreground mb-6">{group.description}</p>
      )}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="wallets">
            <Wallet2 className="h-4 w-4 mr-2" />
            Wallets
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Group Members</h2>
            {canManage && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.members.map(member => (
              <Card key={member.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {member.user.image ? (
                        <img 
                          src={member.user.image} 
                          alt={member.user.name || 'User'} 
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {(member.user.name || member.user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{member.user.name || 'Unnamed User'}</CardTitle>
                        <CardDescription className="text-xs">{member.user.email}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={member.role === 'OWNER' ? "default" : (member.role === 'ADMIN' ? "secondary" : "outline")}>
                      {member.role}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Group Wallets</h2>
            {canManage && (
              <Button onClick={() => setShowCreateWalletDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            )}
          </div>

          {wallets.length === 0 ? (
            <div className="text-center py-10 bg-muted rounded-lg">
              <Wallet2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Wallets Yet</h3>
              <p className="text-muted-foreground mb-4">Create a wallet to start managing group finances</p>
              {canManage && (
                <Button onClick={() => setShowCreateWalletDialog(true)}>
                  Create First Wallet
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <Card key={wallet.id}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle>{wallet.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 pb-2">
                    <div className="text-2xl font-semibold">
                      {formatCurrency(wallet.balance, wallet.currencyCode)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {wallet.currencyCode}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/groups/${params.groupId}/wallets/${wallet.id}`}>
                        Manage
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab (Owner Only) */}
        {isOwner && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Group Settings</CardTitle>
                <CardDescription>Manage your group settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Group settings will be implemented in future versions of this feature.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Wallet Dialog */}
      <Dialog open={showCreateWalletDialog} onOpenChange={setShowCreateWalletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Wallet</DialogTitle>
            <DialogDescription>
              Create a wallet to track group expenses and income
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWallet}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Wallet Name</Label>
                <Input
                  id="name"
                  placeholder="Main Wallet, Trip Fund, etc."
                  value={walletFormData.name}
                  onChange={(e) => setWalletFormData({...walletFormData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input
                  id="currencyCode"
                  value={walletFormData.currencyCode}
                  onChange={(e) => setWalletFormData({...walletFormData, currencyCode: e.target.value})}
                  required
                  disabled // For now, only support IDR
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateWalletDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Wallet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription>
              Share this code with people you want to invite to your group
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {activeInvite ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md flex justify-between items-center">
                  <code className="text-lg font-mono">{activeInvite.code}</code>
                  <Button variant="outline" size="sm" onClick={copyInviteCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  This invite expires on {new Date(activeInvite.expiresAt).toLocaleDateString()}
                </div>
                <div className="flex justify-center">
                  <Button variant="outline" className="w-full" onClick={() => setShowInviteDialog(false)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p>No active invite found. Generate a new invite code.</p>
                <Button onClick={createNewInvite} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Generating...' : 'Generate Invite Code'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 