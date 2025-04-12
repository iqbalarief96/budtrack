'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import useToast from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address to test',
        variant: 'destructive'
      })
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        toast({
          title: 'Email sent!',
          description: `Test email was sent to ${email}`,
        })
      } else {
        toast({
          title: 'Failed to send email',
          description: data.message || 'Something went wrong',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error testing email:', error)
      toast({
        title: 'Error',
        description: 'Something went wrong while sending the test email',
        variant: 'destructive'
      })
      setResult({ success: false, error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Sending</CardTitle>
          <CardDescription>
            Send a test email via Brevo API to verify your configuration
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {result && (
            <div className="mt-4 p-3 text-sm rounded border bg-muted">
              <pre className="whitespace-pre-wrap overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Test Email'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 