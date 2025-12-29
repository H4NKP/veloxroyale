'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui/core';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { authenticateUser } from '@/lib/auth';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/components/LanguageContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });

  // Recovery State
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverStatus, setRecoverStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [recoverMsg, setRecoverMsg] = useState('');

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
        login(user);
        router.push('/admin');
      } else {
        login(user);
        router.push('/panel');
      }
    } else {
      setError(t('loginFailed'));
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverStatus('sending');
    setRecoverMsg('');

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmail })
      });
      const data = await res.json();

      if (data.success) {
        setRecoverStatus('sent');
        setRecoverMsg(t('recoveryEmailSent'));
      } else {
        setRecoverStatus('error');
        setRecoverMsg(data.message || t('recoveryEmailFailed'));
      }
    } catch (err: any) {
      setRecoverStatus('error');
      setRecoverMsg(t('networkError'));
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
          <p className="text-pterosub mt-2 text-sm">{t('signInTitle')}</p>
        </div>

        <Card className="border-t-4 border-t-pteroblue bg-[#1a202c]/50 backdrop-blur-sm shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">{t('usernameOrEmail')}</label>
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
              <label className="text-xs font-semibold text-pterosub uppercase tracking-wide">{t('password')}</label>
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRecover(true)}
                className="text-xs text-pteroblue hover:text-pteroblue/80 hover:underline transition-colors"
              >
                {t('forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : t('login')}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 text-xs text-pterosub/50">
          {t('copyright')}
        </p>
      </div>

      {/* Recover Modal */}
      {showRecover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-[#1a202c] border-pteroblue/20 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-pterotext mb-2">{t('recoverPassword')}</h3>
            <p className="text-sm text-pterosub mb-4">{t('recoverPasswordDesc')}</p>

            {recoverStatus === 'sent' ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
                  <Mail className="text-green-500" size={24} />
                </div>
                <p className="text-green-400 text-sm font-medium">{recoverMsg}</p>
                <Button
                  onClick={() => { setShowRecover(false); setRecoverStatus('idle'); }}
                  className="w-full mt-4"
                  variant="secondary"
                >
                  {t('backToLogin')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRecover} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={recoverEmail}
                    onChange={e => setRecoverEmail(e.target.value)}
                    required
                    className="bg-pterodark/50"
                  />
                </div>
                {recoverStatus === 'error' && (
                  <p className="text-xs text-red-400">{recoverMsg}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowRecover(false)}
                    className="flex-1"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={recoverStatus === 'sending'}
                    className="flex-1 bg-pteroblue hover:bg-pteroblue/90 text-white"
                  >
                    {recoverStatus === 'sending' ? <Loader2 className="animate-spin" size={16} /> : t('sendLink')}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
