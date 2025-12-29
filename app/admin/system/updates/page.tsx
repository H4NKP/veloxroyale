'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { RefreshCw, Github, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function UpdatesPage() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'idle' | 'checking' | 'up_to_date' | 'update_available' | 'unavailable' | 'error'>('idle');
    const [details, setDetails] = useState<any>(null);

    const checkForUpdates = async () => {
        setStatus('checking');
        try {
            const res = await fetch('/api/system/updates', {
                method: 'POST',
                body: JSON.stringify({ action: 'check' })
            });
            const data = await res.json();

            if (data.status) {
                setStatus(data.status);
                setDetails(data);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleUpdateSystem = async () => {
        if (!confirm("Are you sure you want to update the system? This will pull changes from the remote repository.")) return;

        const prevStatus = status;
        setStatus('checking');

        try {
            const res = await fetch('/api/system/updates', {
                method: 'POST',
                body: JSON.stringify({ action: 'update' })
            });
            const data = await res.json();

            if (data.status === 'success') {
                alert("Update Successful!\n" + data.logs);
                window.location.reload();
            } else {
                alert("Update Failed: " + data.message);
                setStatus('update_available');
            }
        } catch (e: any) {
            alert("Update Request Failed: " + e.message);
            setStatus('update_available');
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-pterotext">{t('githubUpdates') || 'System Updates'}</h1>
                <p className="text-pterosub mt-2">Check for the latest version of VeloxAI Panel directly from GitHub.</p>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">

                    {/* Status Icon */}
                    <div className={`p-4 rounded-full transition-all duration-500 ${status === 'idle' ? 'bg-gray-500/10 text-gray-400' :
                            status === 'checking' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                                status === 'up_to_date' ? 'bg-green-500/10 text-green-500' :
                                    status === 'update_available' ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-red-500/10 text-red-500'
                        }`}>
                        {status === 'idle' && <Github size={48} />}
                        {status === 'checking' && <RefreshCw size={48} className="animate-spin" />}
                        {status === 'up_to_date' && <CheckCircle size={48} />}
                        {status === 'update_available' && <AlertTriangle size={48} />}
                        {(status === 'unavailable' || status === 'error') && <XCircle size={48} />}
                    </div>

                    {/* Status Text */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-pterotext">
                            {status === 'idle' && "Check for Updates"}
                            {status === 'checking' && "Checking Repository..."}
                            {status === 'up_to_date' && "System is Up to Date"}
                            {status === 'update_available' && "New Update Available"}
                            {status === 'unavailable' && "Source Unavailable"}
                            {status === 'error' && "Check Failed"}
                        </h2>
                        <p className="text-pterosub max-w-md mx-auto">
                            {status === 'idle' && "Connect to the official repository to verify your installation integrity."}
                            {status === 'checking' && "Contacting https://github.com/H4NKP/veloxroyal..."}
                            {status === 'up_to_date' && "You are running the latest version of VeloxAI."}
                            {status === 'update_available' && "A newer version is available on the remote repository."}
                            {status === 'unavailable' && (details?.message || "Error while connecting to the repository.")}
                            {status === 'error' && "An undefined error occurred while checking for updates."}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        {status === 'update_available' ? (
                            <>
                                <Button
                                    onClick={handleUpdateSystem}
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                                >
                                    <RefreshCw size={16} className="mr-2" />
                                    Update Now
                                </Button>
                                <Button
                                    onClick={() => { setStatus('idle'); setDetails(null); }}
                                    className="bg-gray-600 hover:bg-gray-700 text-white min-w-[140px]"
                                >
                                    Remain on Current
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={checkForUpdates}
                                disabled={status === 'checking'}
                                className={`min-w-[200px] ${status === 'update_available' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''
                                    }`}
                            >
                                {status === 'idle' ? 'Check Now' : 'Check Again'}
                            </Button>
                        )}
                    </div>

                    {/* Technical Details */}
                    {details && (
                        <div className="mt-6 p-4 bg-pteroborder/20 rounded-lg text-left w-full max-w-lg space-y-2 font-mono text-xs">
                            <div className="flex justify-between border-b border-pteroborder/50 pb-2 mb-2">
                                <span className="text-pterosub">STATUS_CODE</span>
                                <span className={status === 'up_to_date' ? 'text-green-400' : status === 'update_available' ? 'text-yellow-400' : 'text-red-400'}>
                                    {details.status?.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-pterosub">LOCAL_SHA</span>
                                <span className="text-pterotext">{details.local?.substring(0, 7) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-pterosub">REMOTE_SHA</span>
                                <span className="text-pterotext">{details.remote?.substring(0, 7) || 'N/A'}</span>
                            </div>
                            {status === 'update_available' && (
                                <div className="pt-2 mt-2 border-t border-pteroborder/50 text-center">
                                    <a href="https://github.com/H4NKP/veloxroyal" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center justify-center gap-1">
                                        View Changes on GitHub <ArrowRight size={10} />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
