import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Play, ArrowRight, User, Mail, Lock } from 'lucide-react';

export default function SignUp() {
  const { signUp, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, username);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email to confirm your account!');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden selection:bg-[#FF0000]/30 font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[center_top_-1px]" />
        <div className="absolute -top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#FF0000]/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[30%] -left-[5%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full bg-[#FF0000]/5 blur-[100px]" />
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
            Join the Party
          </h1>
          <p className="mt-3 text-lg text-gray-400 font-medium">
            Synced watching, anywhere in the world
          </p>
        </div>

        <Card className="glass-card border-white/10 group overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-[#FF0000] to-transparent opacity-50" />
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2.5">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-300 ml-1">Username</Label>
                <div className="relative group/input">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within/input:text-[#FF0000] transition-colors" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="coolviewer42"
                    required
                    className="h-12 pl-12 bg-white/5 border-white/10 focus:border-[#FF0000]/50 focus:ring-[#FF0000]/20 transition-all text-white placeholder:text-gray-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-300 ml-1">Email Address</Label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within/input:text-[#FF0000] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="h-12 pl-12 bg-white/5 border-white/10 focus:border-[#FF0000]/50 focus:ring-[#FF0000]/20 transition-all text-white placeholder:text-gray-500 rounded-xl"
                  />
                </div>
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="password" title="password" className="text-sm font-semibold text-gray-300 ml-1">Password</Label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within/input:text-[#FF0000] transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (min 6 chars)"
                    required
                    minLength={6}
                    className="h-12 pl-12 bg-white/5 border-white/10 focus:border-[#FF0000]/50 focus:ring-[#FF0000]/20 transition-all text-white placeholder:text-gray-500 rounded-xl"
                  />
                </div>
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
                    <span>Launching...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>GET STARTED</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0b0c14] px-4 text-gray-500 font-bold tracking-widest leading-none">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-14 w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group"
                onClick={() => window.location.href = `${import.meta.env.VITE_BACKEND_URL || ''}/api/auth/google`}
              >
                <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>GOOGLE</span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <span>Already have an account?</span>
                <Link to="/login" className="font-bold text-white hover:text-[#FF0000] transition-colors underline underline-offset-4 decoration-[#FF0000]/30 hover:decoration-[#FF0000]">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
