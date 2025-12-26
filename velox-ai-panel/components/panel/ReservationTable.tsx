import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Search, Calendar, Users, Filter, MoreVertical, CheckCircle2, XCircle, Clock, Trash2, Download, Plus, FileText, RefreshCw } from 'lucide-react';
import { getReservationsByServerId, updateReservationStatus, deleteReservation, addReservation, type Reservation } from '@/lib/reservations';
import { triggerSync } from '@/lib/sync';
import { cn } from '@/components/ui/core';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from '@/components/LanguageContext';

interface ReservationTableProps {
    userId: number;
    serverId: number;
}

export function ReservationTable({ userId, serverId }: ReservationTableProps) {
    const { t } = useTranslation();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
    const [dateFilter, setDateFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

    const fetchReservations = async (silent = false) => {
        if (!silent) setIsLoading(true);
        const data = await getReservationsByServerId(serverId, userId);
        setReservations(data);
        if (!silent) setIsLoading(false);
    };

    useEffect(() => {
        fetchReservations();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchReservations(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [serverId]); // Change: Depend on serverId

    const handleStatusChange = async (id: number, newStatus: Reservation['status']) => {
        // 1. Update Local State
        await updateReservationStatus(id, newStatus);
        await triggerSync();
        fetchReservations();

        // 2. Trigger WhatsApp Notification (Background)
        const res = reservations.find(r => r.id === id);
        if (res && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
            try {
                await fetch('/api/whatsapp/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        customerName: res.customerName,
                        customerPhone: res.customerPhone,
                        status: newStatus,
                        date: res.date,
                        time: res.time
                    })
                });
                // Notification sent
            } catch (error) {
                // Failed to send notification
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this reservation?')) {
            await deleteReservation(id);
            await triggerSync();
            fetchReservations();
        }
    };

    const filteredReservations = reservations.filter(res => {
        // Double check server isolation (although fetch should have handled it)
        if (res.serverId !== serverId) return false;

        const matchesSearch =
            res.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.customerPhone.includes(searchTerm) ||
            res.id.toString().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || res.status === statusFilter;
        const matchesDate = !dateFilter || res.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRes, setNewRes] = useState({ name: '', phone: '', date: '', time: '', pax: 2 });

    const handleCreate = async () => {
        if (!newRes.name || !newRes.phone || !newRes.date || !newRes.time || !newRes.pax) {
            alert("All fields are required.");
            return;
        }

        await addReservation({
            userId: userId,
            serverId: serverId, // Change: add serverId
            customerName: newRes.name,
            customerPhone: newRes.phone,
            date: newRes.date,
            time: newRes.time,
            partySize: newRes.pax,
            source: 'Phone',
            status: 'pending'
        });

        setIsCreateOpen(false);
        setNewRes({ name: '', phone: '', date: '', time: '', pax: 2 });
        await triggerSync();
        fetchReservations();
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0); // Black
        doc.text(t('reservationsReport'), 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50); // Dark Gray
        doc.text(`${t('generatedOn')}: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`${t('totalReservationsPDF')}: ${filteredReservations.length}`, 14, 35);

        // Prepare Table Data
        const tableData = filteredReservations.map(res => [
            res.customerName,
            res.customerPhone,
            res.partySize.toString(),
            `${res.date} ${res.time}`,
            res.status.toUpperCase()
        ]);

        // Generate Table
        autoTable(doc, {
            startY: 45,
            head: [[t('customer'), 'Phone', 'Pax', `${t('date')} & ${t('time')}`, t('status')]],
            body: tableData,
            theme: 'plain', // Plain theme for B&W
            headStyles: {
                fillColor: [0, 0, 0], // Black header
                textColor: [255, 255, 255], // White text
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                lineWidth: 0.1,
                lineColor: [200, 200, 200] // Light gray lines
            },
            alternateRowStyles: {
                // No alternate row color for pure B&W print friendliness, or very light gray
                fillColor: [245, 245, 245]
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [0, 0, 0],
                lineWidth: 0
            },
            columnStyles: {
                2: { halign: 'center' }, // Pax column
                4: { fontStyle: 'bold' } // Status column
            }
        });

        doc.save(`reservations_${serverId}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <Card className="p-0 border-pteroborder bg-transparent">
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-pteroborder bg-pterocard/50 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-pterosub" size={16} />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        className="pl-10 h-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 relative">
                    <Button
                        variant="secondary"
                        className={cn(
                            "h-10 px-4 border-pteroborder hover:bg-pteroborder transition-all group flex items-center gap-2",
                            (dateFilter || statusFilter !== 'all') ? "border-pteroblue bg-pteroblue/5 text-pteroblue" : ""
                        )}
                        onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    >
                        <MoreVertical size={18} className={cn("transition-transform duration-300", isActionsMenuOpen ? "rotate-90" : "")} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('actions')}</span>
                        {(dateFilter || statusFilter !== 'all') && (
                            <span className="w-2 h-2 bg-pteroblue rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        )}
                    </Button>

                    <AnimatePresence>
                        {isActionsMenuOpen && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                                    onClick={() => setIsActionsMenuOpen(false)}
                                />

                                {/* Dropdown Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute right-0 top-12 w-72 z-50 bg-pterodark border border-pteroborder rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                                >
                                    {/* Header Section */}
                                    <div className="p-4 border-b border-pteroborder bg-pterocard/30">
                                        <h4 className="text-[10px] font-black text-pterosub uppercase tracking-[0.2em]">{t('managementTools')}</h4>
                                    </div>

                                    {/* Scrollable Content Area */}
                                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                        <div className="p-4 space-y-5">
                                            {/* Primary Actions */}
                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    onClick={() => { setIsCreateOpen(true); setIsActionsMenuOpen(false); }}
                                                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-pteroblue hover:bg-blue-600 text-white transition-all group/btn"
                                                >
                                                    <div className="p-1.5 bg-white/10 rounded-md group-hover/btn:scale-110 transition-transform">
                                                        <Plus size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold">{t('newReservation')}</span>
                                                </button>

                                                <button
                                                    onClick={() => { handleDownloadPDF(); setIsActionsMenuOpen(false); }}
                                                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-pterocard border border-pteroborder hover:border-pterosub/50 text-pterotext transition-all group/btn"
                                                >
                                                    <div className="p-1.5 bg-pteroblue/10 text-pteroblue rounded-md group-hover/btn:scale-110 transition-transform">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold">{t('downloadReport')}</span>
                                                </button>
                                            </div>

                                            {/* Filters Section */}
                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Filter size={12} className="text-pteroblue" />
                                                    <span className="text-[10px] font-black text-pterosub uppercase tracking-widest">{t('searchFilters')}</span>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-pterosub block ml-1">{t('specificDate')}</label>
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                className="w-full bg-pterocard border border-pteroborder text-sm text-pterotext rounded-lg px-3 py-2 outline-none focus:border-pteroblue transition-all h-10"
                                                                value={dateFilter}
                                                                onChange={e => setDateFilter(e.target.value)}
                                                            />
                                                            {dateFilter && (
                                                                <button
                                                                    onClick={() => setDateFilter('')}
                                                                    className="absolute right-3 top-2.5 text-pterosub hover:text-red-400 transition-colors"
                                                                >
                                                                    <XCircle size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-pterosub block ml-1">{t('reservationStatus')}</label>
                                                        <select
                                                            className="w-full bg-pterocard border border-pteroborder text-sm text-pterotext rounded-lg px-3 h-10 outline-none focus:border-pteroblue transition-all"
                                                            value={statusFilter}
                                                            onChange={e => setStatusFilter(e.target.value as any)}
                                                        >
                                                            <option value="all">All Statuses</option>
                                                            <option value="confirmed">Confirmed Only</option>
                                                            <option value="pending">Pending Review</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-3 bg-pterocard/50 border-t border-pteroborder flex flex-col gap-2">
                                            {(dateFilter || statusFilter !== 'all') && (
                                                <button
                                                    onClick={() => { setDateFilter(''); setStatusFilter('all'); }}
                                                    className="w-full py-2 text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={12} /> {t('resetView')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { fetchReservations(); setIsActionsMenuOpen(false); }}
                                                className="w-full py-2 bg-pteroborder/30 hover:bg-pteroborder/50 rounded-md text-[10px] font-black text-pterosub hover:text-pterotext transition-all flex items-center justify-center gap-2 uppercase tracking-tighter"
                                            >
                                                <RefreshCw size={12} /> {t('reloadRecords')}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Create Modal Overlay */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-pterodark border-pteroborder shadow-2xl">
                        <div className="p-4 border-b border-pteroborder flex justify-between items-center">
                            <h3 className="font-semibold text-pterotext">{t('newReservation')}</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-pterosub hover:text-white"><XCircle size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('customer')} <span className="text-red-400">*</span></label>
                                <Input value={newRes.name} onChange={e => setNewRes({ ...newRes, name: e.target.value })} placeholder="John Doe" required />
                            </div>
                            <div>
                                <label className="text-xs text-pterosub uppercase font-bold block mb-1">Phone <span className="text-red-400">*</span></label>
                                <Input value={newRes.phone} onChange={e => setNewRes({ ...newRes, phone: e.target.value })} placeholder="+1 234..." required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('date')} <span className="text-red-400">*</span></label>
                                    <input type="date" className="w-full bg-pterocard border border-pteroborder rounded px-3 py-2 text-sm text-pterotext"
                                        value={newRes.date} onChange={e => setNewRes({ ...newRes, date: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('time')} <span className="text-red-400">*</span></label>
                                    <input type="time" className="w-full bg-pterocard border border-pteroborder rounded px-3 py-2 text-sm text-pterotext"
                                        value={newRes.time} onChange={e => setNewRes({ ...newRes, time: e.target.value })} required />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-pterosub uppercase font-bold block mb-1">{t('people')} <span className="text-red-400">*</span></label>
                                <input type="number" className="w-full bg-pterocard border border-pteroborder rounded px-3 py-2 text-sm text-pterotext"
                                    value={newRes.pax} onChange={e => setNewRes({ ...newRes, pax: parseInt(e.target.value) })} min={1} required />
                            </div>
                        </div>
                        <div className="p-4 border-t border-pteroborder flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>{t('cancel')}</Button>
                            <Button onClick={handleCreate}>{t('confirm')}</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Reservations Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-pteroborder bg-pterodark/30">
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('customer')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest text-center">{t('people')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('date')} & {t('time')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('source')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('status')}</th>
                            <th className="p-4 text-[10px] font-bold text-pterosub uppercase tracking-widest text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pteroborder">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-pterosub">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-4 h-4 border-2 border-pteroblue/30 border-t-pteroblue rounded-full animate-spin" />
                                        Syncing bookings...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredReservations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-pterosub">
                                    {t('noReservations')}
                                </td>
                            </tr>
                        ) : filteredReservations.map((res) => (
                            <tr key={res.id} className="hover:bg-pteroborder/20 transition-colors group">
                                <td className="p-4">
                                    <div className="font-medium text-pterotext">{res.customerName}</div>
                                    <div className="text-[10px] text-pterosub font-mono">{res.customerPhone}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-pteroborder/30 rounded text-xs text-pterotext">
                                        <Users size={12} /> {res.partySize}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-pterotext">
                                        <Calendar size={14} className="text-pterosub" />
                                        {res.date}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-pterosub mt-1">
                                        <Clock size={12} />
                                        {res.time}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge variant="blue" className="bg-pteroblue/5 text-pteroblue border-pteroblue/10 font-normal">
                                        {res.source}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    {res.status === 'confirmed' && (
                                        <span className="flex items-center gap-2 text-green-400 text-xs font-medium">
                                            <CheckCircle2 size={14} /> {res.status}
                                        </span>
                                    )}
                                    {res.status === 'pending' && (
                                        <span className="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                                            <Clock size={14} /> {res.status}
                                        </span>
                                    )}
                                    {res.status === 'cancelled' && (
                                        <span className="flex items-center gap-2 text-red-400 text-xs font-medium">
                                            <XCircle size={14} /> {res.status}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {res.status !== 'confirmed' && (
                                            <button
                                                onClick={() => handleStatusChange(res.id, 'confirmed')}
                                                className="p-1.5 hover:bg-green-500/10 text-pterosub hover:text-green-400 rounded transition-colors"
                                                title={t('confirm')}
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                        {res.status !== 'pending' && (
                                            <button
                                                onClick={() => handleStatusChange(res.id, 'pending')}
                                                className="p-1.5 hover:bg-yellow-500/10 text-pterosub hover:text-yellow-400 rounded transition-colors"
                                                title="Mark as Pending"
                                            >
                                                <Clock size={16} />
                                            </button>
                                        )}
                                        {res.status !== 'cancelled' && (
                                            <button
                                                onClick={() => handleStatusChange(res.id, 'cancelled')}
                                                className="p-1.5 hover:bg-red-500/10 text-pterosub hover:text-red-400 rounded transition-colors"
                                                title={t('cancel')}
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                        <div className="w-px h-4 bg-pteroborder mx-1" />
                                        <button
                                            onClick={() => handleDelete(res.id)}
                                            className="p-1.5 hover:bg-red-500/10 text-pterosub hover:text-red-500 rounded transition-colors"
                                            title={t('delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <button className="p-1.5 text-pterosub group-hover:hidden">
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
