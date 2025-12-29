import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Search, RotateCcw, Trash2, Archive, AlertCircle } from 'lucide-react';
import { getReservationsByServerId, updateReservationStatus, hardDeleteReservation, type Reservation } from '@/lib/reservations';
import { triggerSync } from '@/lib/sync';
import { useTranslation } from '@/components/LanguageContext';

interface ArchivedReservationsProps {
    userId: number;
    serverId: number;
}

export function ArchivedReservations({ userId, serverId }: ArchivedReservationsProps) {
    const { t } = useTranslation();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchReservations = async () => {
        setIsLoading(true);
        const data = await getReservationsByServerId(serverId, userId);
        // Filter only archived
        setReservations(data.filter(r => r.status === 'archived'));
        setIsLoading(false);
    };

    useEffect(() => {
        fetchReservations();
        const interval = setInterval(fetchReservations, 30000);
        return () => clearInterval(interval);
    }, [serverId]);

    const handleRestore = async (id: number) => {
        if (confirm('Restore this reservation to the active list?')) {
            await updateReservationStatus(id, 'pending');
            await triggerSync();
            fetchReservations();
        }
    };

    const handlePermanentDelete = async (id: number) => {
        if (confirm('WARNING: This will permanently delete the reservation. This action cannot be undone. Continue?')) {
            await hardDeleteReservation(id);
            await triggerSync();
            fetchReservations();
        }
    };

    const filteredReservations = reservations.filter(res =>
        res.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.customerPhone.includes(searchTerm)
    );

    return (
        <Card className="p-0 border-pteroborder bg-transparent animate-in fade-in duration-500">
            <div className="p-4 border-b border-pteroborder bg-pterocard/50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-pterosub">
                    <Archive size={18} />
                    <h3 className="font-bold uppercase tracking-widest text-sm">Archived Reservations</h3>
                </div>
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-2.5 text-pterosub" size={16} />
                    <Input
                        placeholder="Search archived..."
                        className="pl-10 h-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-pteroborder bg-pterodark/30">
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('customer')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('date')} & {t('time')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">Original Status</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pteroborder">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-pterosub">
                                    Loading archive...
                                </td>
                            </tr>
                        ) : filteredReservations.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-pterosub italic">
                                    No archived reservations found.
                                </td>
                            </tr>
                        ) : filteredReservations.map((res) => (
                            <tr key={res.id} className="hover:bg-pteroborder/20 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-pterotext opacity-70">{res.customerName}</div>
                                    <div className="text-[10px] text-pterosub font-mono">{res.customerPhone}</div>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm text-pterosub">{res.date} {res.time}</span>
                                </td>
                                <td className="p-4">
                                    <Badge variant="secondary" className="bg-pterocard border-pteroborder text-pterosub">
                                        ARCHIVED
                                    </Badge>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleRestore(res.id)}
                                            className="p-1.5 hover:bg-pteroblue/10 text-pterosub hover:text-pteroblue rounded transition-colors"
                                            title="Restore"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(res.id)}
                                            className="p-1.5 hover:bg-red-500/10 text-pterosub hover:text-red-500 rounded transition-colors"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
