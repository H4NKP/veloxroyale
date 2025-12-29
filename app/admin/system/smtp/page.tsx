'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components/ui/core';
import { Mail, Save, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SmtpServerPage() {
    const [logs, setLogs] = useState<string[]>([
        "[SMTP]: Configuration panel initialized",
    ]);

    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        secure: false,
        from: '',
        enabled: false
    });
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [smtpStatus, setSmtpStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [smtpError, setSmtpError] = useState('');

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}]: ${msg}`]);
    };

    useEffect(() => {
        // Fetch SMTP config
        fetch('/api/settings/smtp')
            .then(res => res.json())
            .then(data => {
                if (data.host) {
                    setSmtpConfig({ ...data, port: data.port.toString() });
                }
            })
            .catch(err => console.error("Failed to fetch SMTP config", err));
    }, []);

    const handleSaveSmtp = async () => {
        setIsTestingSmtp(true);
        addLog("Saving SMTP configuration...");
        try {
            await fetch('/api/settings/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(smtpConfig)
            });
            addLog("✓ SMTP configuration saved.");
            setSmtpStatus('success');
            setTimeout(() => setSmtpStatus('idle'), 3000);
        } catch (err: any) {
            addLog(`✖ Failed to save SMTP: ${err.message}`);
            setSmtpStatus('error');
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const handleTestSmtp = async () => {
        const testEmail = prompt("Enter email address to send test to:");
        if (!testEmail) return;

        setIsTestingSmtp(true);
        addLog(`Sending test email to ${testEmail}...`);
        try {
            const res = await fetch('/api/settings/smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...smtpConfig, testEmail })
            });
            const data = await res.json();
            if (data.success) {
                addLog("✓ Test email sent successfully!");
                alert("Test email sent!");
            } else {
                addLog(`✖ Send failed: ${data.message}`);
                alert(`Failed: ${data.message}`);
            }
        } catch (err: any) {
            addLog(`✖ Error: ${err.message}`);
        } finally {
            setIsTestingSmtp(false);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-pterotext">SMTP Server Configuration</h1>
                <p className="text-pterosub mt-2">Configure email delivery system for password recovery and notifications.</p>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-orange-500/10">
                                <Mail className="text-orange-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-pterotext">Email Settings</h3>
                                <p className="text-sm text-pterosub">Configure SMTP credentials for outbound mail.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-pterosub uppercase cursor-pointer">
                                <span>Enable SMTP</span>
                                <input
                                    type="checkbox"
                                    checked={smtpConfig.enabled}
                                    onChange={e => setSmtpConfig({ ...smtpConfig, enabled: e.target.checked })}
                                    className="ml-2"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">SMTP Host</label>
                            <Input
                                value={smtpConfig.host}
                                onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Port</label>
                            <Input
                                value={smtpConfig.port}
                                onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                placeholder="587"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">User / Email</label>
                            <Input
                                value={smtpConfig.user}
                                onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                placeholder="notifications@example.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">Password / App Key</label>
                            <Input
                                type="password"
                                value={smtpConfig.pass}
                                onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                                placeholder="********"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-pterosub uppercase font-bold">From Address (Optional)</label>
                            <Input
                                value={smtpConfig.from}
                                onChange={e => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                                placeholder="VeloxAI <no-reply@velox.ai>"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleSaveSmtp} disabled={isTestingSmtp} className="bg-orange-500 hover:bg-orange-600 text-white">
                            <Save size={16} className="mr-2" />
                            {isTestingSmtp ? 'Saving...' : 'Save Config'}
                        </Button>
                        <Button onClick={handleTestSmtp} disabled={!smtpConfig.host || isTestingSmtp} variant="secondary">
                            <Send size={16} className="mr-2" />
                            Test Email
                        </Button>
                    </div>

                    {smtpStatus === 'success' && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle2 size={16} />
                            Configuration saved successfully!
                        </div>
                    )}

                    {smtpStatus === 'error' && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {smtpError || 'Failed to save configuration'}
                        </div>
                    )}
                </div>
            </Card>

            {/* Activity Log */}
            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-pterotext">Activity Log</h3>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
