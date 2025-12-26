'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui/core';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { authenticateUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });

  // Block back/forward navigation on login page
  useEffect(() => {
    // Push initial state
    window.history.pushState(null, '', window.location.href);

    const handleNavigation = () => {
      // Keep user on login page
      window.history.pushState(null, '', window.location.href);
    };

    // Listen for back/forward button
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { identifier, password } = formData;

    // Authenticate using shared user database
    const user = await authenticateUser(identifier, password);

    if (user) {
      // Check if account is suspended
      if (user.status === 'suspended') {
        // Store email to show personalized message on the suspended page
        sessionStorage.setItem('suspended_user_email', identifier);
        router.push('/suspended');
        return;
      }

      // Redirect based on role
      if (user.role === 'admin') {
        router.push(`/admin?userId=${user.id}`);
      } else {
        router.push(`/panel?userId=${user.id}`);
      }
    } else {
      setError('Invalid credentials or account suspended');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pterodark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pteroblue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pterotext tracking-tight">VELOX<span className="text-pteroblue">AI</span></h1>
          <p className="text-pterosub mt-2 text-sm">Sign in to manage your AI workforce</p>
        </div>

        <Card className="border-t-4 border-t-pteroblue bg-[#1a202c]/50 backdrop-blur-sm shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                <Input
                  type="text"
                  placeholder="admin"
                  className="pl-10"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-pterosub" size={16} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 text-xs text-pterosub/50">
          &copy; 2025 VeloxAI System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
