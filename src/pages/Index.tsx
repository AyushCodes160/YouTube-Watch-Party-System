import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Play, Users, Tv, Shield, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute top-20 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/6 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Real-time sync powered by WebSockets</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
              Watch <span className="text-gradient">Together</span>,<br />
              No Matter Where
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
              Create a room, share the link, and enjoy YouTube videos perfectly synced with friends.
              Play, pause, and seek — everyone stays in sync.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to={user ? '/dashboard' : '/signup'}>
                <Button size="lg" className="gradient-primary glow-primary text-lg">
                  {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {!user && (
                <Link to="/login">
                  <Button variant="outline" size="lg" className="text-lg">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <Play className="h-6 w-6" />,
              title: 'Synced Playback',
              desc: 'Play, pause, and seek — all participants see the same frame at the same time.',
            },
            {
              icon: <Users className="h-6 w-6" />,
              title: 'Room Management',
              desc: 'Create rooms, invite friends, manage roles. Hosts control the experience.',
            },
            {
              icon: <Shield className="h-6 w-6" />,
              title: 'Role-Based Control',
              desc: 'Host, Moderator, Participant — granular permissions enforced server-side.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
