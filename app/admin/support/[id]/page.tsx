'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { LifeBuoy, Send, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminTicketDetails({ params }: { params: Promise<{ id: string }> }) { // Updated for Next 15+ async params
    const { t } = useTranslation();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);

    useEffect(() => {
        params.then(setUnwrappedParams);
    }, [params]);

    useEffect(() => {
        if (!unwrappedParams) return;
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [unwrappedParams]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchData = () => {
        if (!unwrappedParams) return;
        fetch(`/api/admin/support/${unwrappedParams.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    router.push('/admin/support');
                    return;
                }
                setTicket(data.ticket);
                // Only update messages if length changed to avoid jitter, or just set
                // For chat, appending is better usually but simple set is fine for polling
                setMessages(data.messages);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !unwrappedParams) return;

        setSending(true);
        try {
            await fetch(`/api/admin/support/${unwrappedParams.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage, adminId: 0 }) // Admin ID 0 or current admin
            });
            setNewMessage('');
            fetchData();
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!unwrappedParams) return;
        try {
            await fetch(`/api/admin/support/${unwrappedParams.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center text-pterosub">{t('loading')}</div>;
    if (!ticket) return <div className="p-8 text-center text-pterosub">{t('ticketNotFound')}</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/admin/support">
                        <Button variant="ghost" className="p-2 h-auto"><ArrowLeft size={16} /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-pterotext flex items-center gap-2">
                            #{ticket.id} - {ticket.subject}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-pterosub mt-1">
                            <User size={12} />
                            {ticket.email}
                            <span>•</span>
                            <Badge variant="gray" className="uppercase text-[10px]">{ticket.priority}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {ticket.status !== 'solved' && (
                        <Button variant="primary" className="text-sm px-3 py-1 h-auto bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange('solved')}>
                            {t('markSolved')}
                        </Button>
                    )}
                    {ticket.status !== 'closed' && (
                        <Button variant="danger" className="text-sm px-3 py-1 h-auto" onClick={() => handleStatusChange('closed')}>
                            {t('close')}
                        </Button>
                    )}
                    {(ticket.status === 'closed' || ticket.status === 'solved') && (
                        <Button variant="secondary" className="text-sm px-3 py-1 h-auto" onClick={() => handleStatusChange('open')}>
                            {t('reopen')}
                        </Button>
                    )}
                </div>
            </header >

            <Card className="flex-1 flex flex-col min-h-0 bg-pterodark/40 border-pteroborder">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg: any) => {
                        const isAdmin = msg.sender_type === 'admin';
                        return (
                            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg p-3 ${isAdmin ? 'bg-pteroblue/20 text-pterotext' : 'bg-pterocard border border-pteroborder'}`}>
                                    <div className="text-xs opacity-50 mb-1 flex justify-between gap-4">
                                        <span className="font-bold">{isAdmin ? t('supportAgent') : ticket.email}</span>
                                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-pteroborder bg-pterocard/30">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder={t('typeReply')}
                            disabled={sending}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={sending || !newMessage.trim()}>
                            <Send size={16} />
                        </Button>
                    </form>
                </div>
            </Card>
        </div >
    );
}
