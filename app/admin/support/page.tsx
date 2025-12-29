'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { LifeBuoy, Filter, Search, Clock, MessageSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminSupportPage() {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetch('/api/admin/support')
            .then(res => res.json())
            .then(data => {
                setTickets(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    const searchParams = useSearchParams();
    const view = searchParams.get('view'); // 'archived' or null (active)

    const filteredTickets = tickets.filter(ticket => {
        // Archive View: Show 'solved' and 'closed' (optional?) or just solved?
        // User request: "once is marked as solved it will be archived... admin can see it in the solved sub module"
        // Let's make "Archived" view show 'solved' and 'closed' tickets, and "Active" view show 'open', 'customer_reply', 'answered'.

        if (view === 'archived') {
            return ['solved', 'closed'].includes(ticket.status);
        } else {
            // Active View
            if (filter === 'all') return !['solved', 'closed'].includes(ticket.status);
            return ticket.status === filter;
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'blue';
            case 'customer_reply': return 'yellow';
            case 'answered': return 'green';
            case 'closed': return 'gray';
            case 'solved': return 'green';
            default: return 'gray';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'red';
            case 'high': return 'orange'; // Assuming orange variant exists or fallback
            case 'medium': return 'blue';
            case 'low': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                        <LifeBuoy className="text-orange-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-pterotext">{t('support')}</h1>
                        <p className="text-pterosub">{t('supportDesc')}</p>
                    </div>
                </div>
                <Link href="/admin/system/support">
                    <Button variant="secondary" className="text-xs">
                        {t('ticketLimits') || "Settings"}
                    </Button>
                </Link>
            </header>

            <Card className="border-pteroborder bg-pterodark/40">
                <div className="p-4 border-b border-pteroborder flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'primary' : 'ghost'}
                        onClick={() => setFilter('all')}
                        className="text-xs"
                    >
                        {t('all')}
                    </Button>
                    <Button
                        variant={filter === 'open' ? 'primary' : 'ghost'}
                        onClick={() => setFilter('open')}
                        className="text-xs"
                    >
                        {t('open')}
                    </Button>
                    <Button
                        variant={filter === 'closed' ? 'primary' : 'ghost'}
                        onClick={() => setFilter('closed')}
                        className="text-xs"
                    >
                        {t('closed')}
                    </Button>
                </div>

                <div className="divide-y divide-pteroborder">
                    {loading ? (
                        <div className="p-8 text-center text-pterosub">{t('loadingTickets')}</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-pterosub">{t('noTickets')}</div>
                    ) : (
                        filteredTickets.map(ticket => (
                            <Link
                                href={`/admin/support/${ticket.id}`}
                                key={ticket.id}
                                className="block p-4 hover:bg-pterocard/50 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-pterotext">{ticket.subject}</h3>
                                            <Badge variant={ticket.priority === 'urgent' ? 'red' : ticket.priority === 'high' ? 'yellow' : 'gray'} className="text-[10px] uppercase">
                                                {t(ticket.priority) || ticket.priority}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-pterosub flex items-center gap-2">
                                            <span>#{ticket.id}</span>
                                            <span>•</span>
                                            <span>{ticket.email}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(ticket.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant={ticket.status === 'open' ? 'blue' : ticket.status === 'customer_reply' ? 'yellow' : 'gray'}>
                                        {t(ticket.status) || ticket.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}
