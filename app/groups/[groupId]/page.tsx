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
  UserPlus, ArrowLeft, Plus, Share2, Edit, Lock, Bell, Download, Trash2
} from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

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
  const [activeTab, setActiveTab] = useState('members')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [privacySetting, setPrivacySetting] = useState('public')
  const [notificationSetting, setNotificationSetting] = useState('email')

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

  const formatCurrency = (amount: number, currencyCode = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Cek role dari user aktif
  const userRole = group?.members.find(member => member.user.id === session?.user?.id)?.role || 'MEMBER'
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN'
  const canManage = isOwner || isAdmin
  
  // Fungsi untuk beralih ke tab Members
  const goToMembersTab = () => {
    setActiveTab('members')
  }
  
  // Handle member management
  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/groups/${params.groupId}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          role: newRole
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Update members list locally
        if (group) {
          const updatedMembers = group.members.map(member => 
            member.user.id === memberId 
              ? { ...member, role: newRole }
              : member
          )
          
          setGroup({
            ...group,
            members: updatedMembers
          })
        }
        
        toast({
          title: 'Role Updated',
          description: `Member's role has been updated to ${newRole}`,
        })
      } else {
        toast({
          title: 'Failed to update role',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while updating the member role',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
      try {
        setIsSubmitting(true)
        
        const response = await fetch(`/api/groups/${params.groupId}/members?memberId=${memberId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          // Update members list locally by removing the member
          if (group) {
            const updatedMembers = group.members.filter(member => 
              member.user.id !== memberId
            )
            
            setGroup({
              ...group,
              members: updatedMembers
            })
          }
          
          toast({
            title: 'Member Removed',
            description: `${memberName} has been removed from the group`,
          })
        } else {
          const data = await response.json()
          toast({
            title: 'Failed to remove member',
            description: data.error || 'An error occurred',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error removing member:', error)
        toast({
          title: 'Error',
          description: 'An error occurred while removing the member',
          variant: 'destructive',
        })
      } finally {
        setIsSubmitting(false)
      }
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

  // Function to handle group rename
  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Group name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast({
        title: "Saving changes...",
        description: "Updating group name",
      });
      
      // Make actual API call to update group name
      const response = await fetch(`/api/groups/${params.groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        if (group) {
          setGroup({
            ...group,
            name: newGroupName
          });
        }
        
        toast({
          title: "Success!",
          description: "Group name has been updated",
        });
        setShowRenameModal(false);
      } else {
        throw new Error(data.error || "Failed to update group name");
      }
    } catch (error) {
      console.error("Error updating group name:", error);
      toast({
        title: "Error",
        description: "Failed to update group name",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Function to handle export data
  const handleExportData = async () => {
    try {
      setIsExporting(true)
      toast({
        title: "Preparing export...",
        description: "Your data will be ready soon",
      })
      
      // Make actual API call to export data
      const response = await fetch(`/api/groups/${params.groupId}/export`, {
        method: 'GET',
        headers: { 'Accept': 'text/csv' },
      })
      
      if (response.ok) {
        // Get the CSV content from the response
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // Create a link and trigger the download
        const link = document.createElement("a")
        link.href = url
        link.download = `group-${params.groupId}-export.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Cleanup the URL object
        URL.revokeObjectURL(url)
        
        toast({
          title: "Export ready!",
          description: "Your data has been exported",
        })
      } else {
        // Fallback to fake CSV if API fails
        toast({
          title: "Using sample data",
          description: "Could not fetch real data, using sample instead",
        })
        
        // Create a fake CSV and trigger download
        const csvContent = "data:text/csv;charset=utf-8,Date,Amount,Description\n2023-01-01,100.00,Sample Transaction\n2023-01-02,50.00,Another Transaction";
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `group-${params.groupId}-export.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      
      // Fallback to fake CSV
      const csvContent = "data:text/csv;charset=utf-8,Date,Amount,Description\n2023-01-01,100.00,Sample Transaction\n2023-01-02,50.00,Another Transaction";
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `group-${params.groupId}-export.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Using sample data",
        description: "Could not fetch real data, using sample instead",
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  // Function to handle delete group
  const handleDeleteGroup = async () => {
    try {
      setIsDeleting(true)
      toast({
        title: "Deleting group...",
        description: "Please wait",
      })
      
      // Make actual API call to delete the group
      const response = await fetch(`/api/groups/${params.groupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        toast({
          title: "Group deleted",
          description: "Your group has been permanently deleted",
        })
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete group")
      }
    } catch (error) {
      console.error("Error deleting group:", error)
      setIsDeleting(false)
      toast({
        title: "Delete failed",
        description: "There was an error deleting your group",
        variant: "destructive",
      })
    }
  }

  // Function to handle privacy settings update
  const handlePrivacyUpdate = async () => {
    try {
      setIsSubmitting(true)
      toast({
        title: "Saving changes...",
        description: "Updating privacy settings",
      })
      
      // Make actual API call to update privacy settings
      const response = await fetch(`/api/groups/${params.groupId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: privacySetting }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Privacy settings have been updated",
        })
        setShowPrivacyModal(false)
      } else {
        throw new Error(data.error || "Failed to update privacy settings")
      }
    } catch (error) {
      console.error("Error updating privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to handle notification settings update
  const handleNotificationUpdate = async () => {
    try {
      setIsSubmitting(true)
      toast({
        title: "Saving changes...",
        description: "Updating notification settings",
      })
      
      console.log(`Updating notification settings to: ${notificationSetting}`)
      
      // Make actual API call to update notification settings
      const response = await fetch(`/api/groups/${params.groupId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationMethod: notificationSetting }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Notification settings have been updated",
        })
        setShowNotificationModal(false)
      } else {
        throw new Error(data.error || "Failed to update notification settings")
      }
    } catch (error) {
      console.error("Error updating notification settings:", error)
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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

      <Tabs defaultValue="members" className="w-full" value={activeTab} onValueChange={setActiveTab}>
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
            {group.members.length > 0 ? (
              group.members.map(member => (
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
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'OWNER' ? "default" : (member.role === 'ADMIN' ? "secondary" : "outline")}>
                          {member.role}
                        </Badge>
                        
                        {/* Member Management Actions */}
                        {canManage && member.user.id !== session?.user?.id && member.role !== 'OWNER' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                              
                              {/* Role options */}
                              {(isOwner || (isAdmin && member.role !== 'ADMIN')) && (
                                <>
                                  <DropdownMenuItem 
                                    disabled={member.role === 'MEMBER' || isSubmitting}
                                    onClick={() => handleUpdateMemberRole(member.user.id, 'MEMBER')}
                                  >
                                    Make Member
                                  </DropdownMenuItem>
                                  
                                  {isOwner && (
                                    <DropdownMenuItem 
                                      disabled={member.role === 'ADMIN' || isSubmitting}
                                      onClick={() => handleUpdateMemberRole(member.user.id, 'ADMIN')}
                                    >
                                      Make Admin
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              
                              {/* Remove option */}
                              <DropdownMenuItem 
                                disabled={isSubmitting}
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleRemoveMember(member.user.id, member.user.name || 'this member')}
                              >
                                Remove from Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 bg-muted rounded-lg col-span-2">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Members Yet</h3>
                <p className="text-muted-foreground mb-4">Invite members to join your group</p>
                {canManage && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                )}
              </div>
            )}
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
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Member Management</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You can manage members from the Members tab. As the group owner, you can:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Promote members to Admin role</li>
                      <li>Demote admins to regular members</li>
                      <li>Remove members from the group</li>
                    </ul>
                    <div className="mt-4">
                      <Button 
                        variant="outline"
                        id="go-to-members-tab"
                        onClick={goToMembersTab}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Go to Members Tab
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Group Invites</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You can generate invite codes to share with people you want to add to your group.
                    </p>
                    <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Invites
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Other Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize your group settings and preferences.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Group Name</h4>
                          <p className="text-sm text-muted-foreground">Change your group's name</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowRenameModal(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Name
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Privacy Settings</h4>
                          <p className="text-sm text-muted-foreground">Control who can see your group</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowPrivacyModal(true)}>
                          <Lock className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Notification Settings</h4>
                          <p className="text-sm text-muted-foreground">Manage how you receive updates</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowNotificationModal(true)}>
                          <Bell className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Export Data</h4>
                          <p className="text-sm text-muted-foreground">Download your group's financial data</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExportData}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-red-600">Delete Group</h4>
                          <p className="text-sm text-muted-foreground">Permanently delete this group and all data</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the group
                                and all associated data including transactions and wallet information.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteGroup} disabled={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete Group'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Rename Group Dialog */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>
              Enter a new name for your group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameGroup()
          }}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="newGroupName">New Group Name</Label>
                <Input
                  id="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowRenameModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Renaming...' : 'Rename Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Privacy Settings Dialog */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>
              Control who can see your group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handlePrivacyUpdate()
          }}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="privacySetting">Privacy Setting</Label>
                <Select
                  value={privacySetting}
                  onValueChange={(value) => setPrivacySetting(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select privacy setting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowPrivacyModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Manage how you receive updates
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleNotificationUpdate()
          }}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="notificationSetting">Notification Setting</Label>
                <Select
                  value={notificationSetting}
                  onValueChange={(value) => setNotificationSetting(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification setting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowNotificationModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 