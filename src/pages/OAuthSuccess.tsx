import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const dataStr = searchParams.get('data');
    if (dataStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(dataStr));
        localStorage.setItem('watch_party_user', JSON.stringify(userData));
        
        // Use a small delay for a smoother transition
        const timer = setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error('OAuth Data Parse Error:', err);
        toast.error('Authentication failed');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#050508] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="animate-pulse text-lg font-medium text-muted-foreground">
          Authenticating with Google...
        </p>
      </div>
    </div>
  );
}
