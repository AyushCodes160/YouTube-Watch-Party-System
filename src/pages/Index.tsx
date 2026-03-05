import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Play, Users, Tv, Shield, Zap, ArrowRight, LogOut, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ConcentricCircles } from '@/components/ConcentricCircles';

export default function Index() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#09090b]/90 text-white font-sans selection:bg-primary/30 relative">
      <div className="absolute inset-0 z-[-1] backdrop-blur-3xl"></div>

      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Soft peach glow top left */}
        <div className="absolute -left-[10%] -top-[10%] h-[700px] w-[700px] rounded-full bg-accent/20 blur-[140px]" />
        {/* Deep purple glow center right */}
        <div className="absolute right-[5%] top-[20%] h-[800px] w-[800px] rounded-full bg-primary/20 blur-[150px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-8 lg:py-10">
        
        {/* Navbar */}
        <nav className="flex shrink-0 items-center justify-between rounded-full border border-white/5 bg-white/5 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF0000] text-white">
               <Play className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">WatchParty</span>
          </div>
          
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 px-6">
                    Join Now
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="hidden md:inline-block text-sm font-medium text-gray-300">
                  Hello, <span className="text-white">{user.username}</span>
                </span>
                <Button 
                  onClick={handleLogout}
                  className="rounded-full bg-white/10 border border-white/20 text-white hover:bg-destructive/20 hover:text-destructive transition-colors px-6"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6 lg:flex-row lg:gap-8 mt-4 sm:mt-8 md:mt-12 lg:mt-0 xl:mt-8">
          
          {/* Left Text Content */}
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left z-10 justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center lg:items-start"
            >
              <h1 className="mb-4 text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
                Unlock <span className="text-gray-300">Perfectly Synced</span><br/>
                Watch Parties You Thought<br/>
                Were Out of Reach –<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a78bfa]">Now Just One Click Away!</span>
              </h1>
              
              <p className="mb-6 max-w-xl text-sm sm:text-base md:text-lg text-gray-400">
                Experience YouTube without borders. Create a room, share the link, and enjoy videos perfectly in sync with friends. Play, pause, and seek — everyone stays together.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link to={user ? '/dashboard' : '/signup'}>
                  <Button size="lg" className="rounded-full bg-[#1A1A24] text-white hover:bg-primary border border-white/10 glow-primary transition-all duration-300 px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg h-12 sm:h-14">
                    {user ? 'Go to Dashboard' : 'Start Watching'} <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
                

              </div>
            </motion.div>
          </div>

          {/* Right Graphic Content */}
          <div className="relative hidden w-full flex-1 items-center justify-center lg:flex min-h-[300px] xl:min-h-[400px]">
             <div className="scale-75 xl:scale-90 2xl:scale-100 flex items-center justify-center w-full h-full">
               <ConcentricCircles />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
