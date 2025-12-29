'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';

export default function CustomerTicketChat({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useTranslation();
    const { user } = useSession();

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
        if (!unwrappedParams || !user) return;
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [unwrappedParams, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchData = () => {
        if (!unwrappedParams || !user) return;
        fetch(`/api/support/${unwrappedParams.id}?userId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setTicket(data.ticket);
                    setMessages(data.messages);
                }
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !unwrappedParams || !user) return;

        setSending(true);
        try {
            await fetch(`/api/support/${unwrappedParams.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, message: newMessage })
            });
            setNewMessage('');
            fetchData();
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found or access denied.</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex items-center gap-3 shrink-0">
                <Link href={`/panel/support`}>
                    <Button variant="ghost" className="p-2 h-auto"><ArrowLeft size={16} /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-pterotext flex items-center gap-2">
                        {ticket.subject}
                        <Badge variant={ticket.status === 'answered' ? 'green' : 'gray'}>{ticket.status}</Badge>
                    </h1>
                    <p className="text-sm text-pterosub">Request #{ticket.id} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
            </header>

            <Card className="flex-1 flex flex-col min-h-0 bg-pterodark/40 border-pteroborder">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg: any) => {
                        const isUser = msg.sender_type === 'user';
                        return (
                            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${isUser ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-pterocard border border-pteroborder'}`}>
                                    <div className="text-xs opacity-50 mb-1 font-bold">
                                        {isUser ? 'You' : 'Support Team'}
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                    <div className="text-[10px] opacity-50 mt-1 text-right">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {ticket.status !== 'closed' ? (
                    <div className="p-4 border-t border-pteroborder bg-pterocard/30">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                disabled={sending}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={sending || !newMessage.trim()}>
                                <Send size={16} />
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="p-4 border-t border-pteroborder bg-pterocard/30 text-center text-pterosub">
                        This ticket is closed.
                    </div>
                )}
            </Card>
        </div>
    );
}
