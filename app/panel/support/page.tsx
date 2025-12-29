'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, cn } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';

export default function CustomerSupportPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // New Ticket State
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('medium');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (user) {
            fetchTickets();
        }
    }, [user]);

    const fetchTickets = () => {
        if (!user) return;
        fetch(`/api/support?userId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                setTickets(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, subject, message, priority })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                setCreateModalOpen(false);
                setSubject('');
                setMessage('');
                fetchTickets();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };


    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                        <LifeBuoy className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-pterotext">{t('support')}</h1>
                        <p className="text-pterosub">{t('supportDesc')}</p>
                    </div>
                </div>
                <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    {t('newTicket')}
                </Button>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="divide-y divide-pteroborder">
                    {loading ? (
                        <div className="p-8 text-center text-pterosub">Loading...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-pterosub">No tickets found. Create one to get started.</div>
                    ) : (
                        tickets.map(ticket => (
                            <Link
                                href={`/panel/support/${ticket.id}`}
                                key={ticket.id}
                                className="block p-4 hover:bg-pterocard/50 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-pterotext">{ticket.subject}</h3>
                                        <div className="text-sm text-pterosub flex items-center gap-2">
                                            <span className={cn(
                                                "uppercase text-[10px] px-1 rounded font-bold",
                                                ticket.priority === 'urgent' ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-400"
                                            )}>
                                                {t(ticket.priority)}
                                            </span>
                                            <span>#{ticket.id}</span>
                                            <span>•</span>
                                            <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Badge variant={ticket.status === 'answered' ? 'green' : ticket.status === 'closed' ? 'gray' : 'blue'}>
                                        {ticket.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </Card>

            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md bg-pterodark border-pteroborder p-6 space-y-4">
                        <h2 className="text-xl font-bold text-pterotext">{t('newTicket')}</h2>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('subject')}</label>
                                <Input value={subject} onChange={e => setSubject(e.target.value)} required />
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <input
                                    type="checkbox"
                                    id="urgent"
                                    className="w-4 h-4 rounded border-red-500/50 bg-transparent text-red-500 focus:ring-red-500/50"
                                    checked={priority === 'urgent'}
                                    onChange={e => setPriority(e.target.checked ? 'urgent' : 'medium')}
                                />
                                <label htmlFor="urgent" className="text-sm font-medium text-red-400 cursor-pointer select-none">
                                    {t('urgent')} — {t('urgentDesc') || 'Requires immediate admin attention'}
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('message')}</label>
                                <textarea
                                    className="w-full bg-pterocard border border-pteroborder rounded-lg px-3 py-2 text-pterotext min-h-[100px]"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : t('createTicket')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
