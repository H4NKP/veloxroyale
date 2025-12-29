'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components/ui/core';
import { useTranslation } from '@/components/LanguageContext';
import { LifeBuoy, Save } from 'lucide-react';

export default function AdminSupportSettingsPage() {
    const { t } = useTranslation();
    const [maxTickets, setMaxTickets] = useState('3');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/support?type=settings')
            .then(res => res.json())
            .then(data => {
                if (data.maxTickets) setMaxTickets(data.maxTickets.toString());
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/admin/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'settings', maxTickets: parseInt(maxTickets) })
            });
            alert(t('settingsSaved') || "Settings saved");
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                        <LifeBuoy className="text-orange-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-pterotext">{t('ticketLimits')}</h1>
                        <p className="text-pterosub">Configure support system limits.</p>
                    </div>
                </div>
            </header>

            <Card className="border-pteroborder bg-pterodark/40 p-6 space-y-4 max-w-xl">
                <div>
                    <label className="block text-sm font-medium text-pterotext mb-1">{t('maxOpenTickets')}</label>
                    <Input
                        type="number"
                        value={maxTickets}
                        onChange={e => setMaxTickets(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-pterosub mt-1">Maximum number of concurrent open tickets per user.</p>
                </div>

                <Button onClick={handleSave} disabled={saving || loading}>
                    <Save size={16} className="mr-2" />
                    {saving ? 'Saving...' : t('saveSettings')}
                </Button>
            </Card>
        </div>
    );
}
