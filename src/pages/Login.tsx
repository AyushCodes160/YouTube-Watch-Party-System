import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';

export default function Login() {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden selection:bg-[#FF0000]/30 font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[center_top_-1px]" />
        <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-[#FF0000]/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[400px] w-[400px] rounded-full bg-[#FF0000]/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-10 text-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF0000] text-white shadow-[0_0_40px_rgba(255,0,0,0.4)]"
          >
            <Play className="h-10 w-10 fill-white ml-1" />
          </motion.div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Welcome Back
          </h1>
          <p className="mt-3 text-lg text-gray-400 font-medium">
            The party is waiting for you
          </p>
        </div>

        <Card className="glass-card border-white/10 group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF0000] to-transparent opacity-50" />
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-300 ml-1">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="h-12 bg-white/5 border-white/10 focus:border-[#FF0000]/50 focus:ring-[#FF0000]/20 transition-all text-white placeholder:text-gray-500 rounded-xl"
                />
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="password" className="text-sm font-semibold text-gray-300">Password</Label>
                  <Link to="/forgot-password" title="forgot password" className="text-xs font-semibold text-[#FF0000] hover:text-[#FF0000]/80 transition-colors uppercase tracking-wider">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 bg-white/5 border-white/10 focus:border-[#FF0000]/50 focus:ring-[#FF0000]/20 transition-all text-white placeholder:text-gray-500 rounded-xl"
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-6 pb-8 pt-2">
              <Button 
                type="submit" 
                disabled={submitting}
                className="h-14 w-full gradient-youtube text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all duration-300 group"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Syncing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>SIGN IN</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <span>Not a member yet?</span>
                <Link to="/signup" className="font-bold text-white hover:text-[#FF0000] transition-colors underline underline-offset-4 decoration-[#FF0000]/30 hover:decoration-[#FF0000]">
                  Create account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
