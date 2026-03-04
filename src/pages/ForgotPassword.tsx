import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Check your email for reset instructions');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <h1 className="mb-2 text-2xl font-bold">Reset password</h1>
        <p className="mb-6 text-muted-foreground">We'll send you a link to reset your password.</p>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          {sent ? (
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Check your email for a reset link.</p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
