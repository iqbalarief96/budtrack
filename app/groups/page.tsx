'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Users, Plus, UserPlus, Wallet2 } from 'lucide-react'

export default function GroupsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
  })
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session) {
      loadGroups()
    }
  }, [session])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      } else {
        console.error('Failed to load groups')
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Grup berhasil dibuat',
          description: `Grup "${data.name}" telah dibuat dan siap digunakan`,
        })
        setCreateFormData({ name: '', description: '' })
        setShowCreateDialog(false)
        await loadGroups()
      } else {
        toast({
          title: 'Gagal membuat grup',
          description: data.error || 'Terjadi kesalahan saat membuat grup',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat membuat grup',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Berhasil bergabung',
          description: data.message || `Anda telah bergabung dengan grup`,
        })
        setInviteCode('')
        setShowJoinDialog(false)
        await loadGroups()
      } else {
        toast({
          title: 'Gagal bergabung',
          description: data.error || 'Terjadi kesalahan saat bergabung ke grup',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error joining group:', error)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mencoba bergabung',
        variant: 'destructive',
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

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Group Budgets</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Join Group
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 bg-muted rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
          <p className="text-muted-foreground mb-4">Create or join a group to start managing budgets together</p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
              Join Existing Group
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create New Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group._count?.members} member{group._count?.members !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {group.description || 'No description provided'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Wallets</div>
                    <div className="flex items-center">
                      <Wallet2 className="h-3.5 w-3.5 mr-1" />
                      {group._count?.wallets || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Your Role</div>
                    <div className="capitalize">
                      {group.ownerId === session.user.id ? 'Owner' : 'Member'}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button asChild className="w-full">
                  <Link href={`/groups/${group.id}`}>
                    View Group
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to manage budgets and expenses with others.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="Family Budget, Trip to Bali, etc."
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this group for?"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Group</DialogTitle>
            <DialogDescription>
              Enter the invite code to join an existing group.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinGroup}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="Enter the invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowJoinDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Joining...' : 'Join Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 