import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui/core';
import { Search, Calendar, Users, Filter, MoreVertical, CheckCircle2, XCircle, Clock, Trash2, Download, Plus, FileText, RefreshCw, User } from 'lucide-react';
import { getReservationsByServerId, updateReservationStatus, deleteReservation, addReservation, updateReservation, type Reservation } from '@/lib/reservations';
import { triggerSync } from '@/lib/sync';
import { Sheet } from '@/components/ui/sheet';
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
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [tempStaffNotes, setTempStaffNotes] = useState('');
    const [tempStructured, setTempStructured] = useState<any>({});
    const [tempCoreData, setTempCoreData] = useState<any>({});
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isSavingStructured, setIsSavingStructured] = useState(false);
    const [isSavingCore, setIsSavingCore] = useState(false);




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
        if (confirm(t('deleteConfirm'))) {
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

        const matchesStatus = (statusFilter === 'all' ? res.status !== 'archived' : res.status === statusFilter);
        const matchesDate = !dateFilter || res.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRes, setNewRes] = useState({ name: '', phone: '', date: '', time: '', pax: 2, notes: '' });


    const handleCreate = async () => {
        if (!newRes.name || !newRes.phone || !newRes.date || !newRes.time || !newRes.pax) {
            alert(t('allFieldsRequired'));
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
            status: 'pending',
            notes: newRes.notes
        });

        setIsCreateOpen(false);
        setNewRes({ name: '', phone: '', date: '', time: '', pax: 2, notes: '' });

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
        doc.text(`${t('totalReservationsPDF') || 'Total Reservations'}: ${filteredReservations.length}`, 14, 35);

        // Prepare Table Data
        const tableData = filteredReservations.map(res => [
            res.customerName,
            res.customerPhone,
            res.partySize.toString(),
            `${res.date} ${res.time}`,
            res.status.toUpperCase(),
            res.staff_notes || res.notes || ''
        ]);

        // Generate Table
        autoTable(doc, {
            startY: 45,
            head: [[t('customer'), t('phone'), t('pax'), `${t('date')} & ${t('time')}`, t('status'), t('notes')]],
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
        <Card className="p-0 border-pteroborder bg-[#0d1117] rounded-xl overflow-hidden shadow-2xl">
            {/* Window Title Bar */}
            <div className="px-4 py-3 border-b border-pteroborder bg-[#161b22] flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Title */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/50 select-none">
                        <Calendar size={14} />
                        <span>reservations_module — {filteredReservations.length} records</span>
                    </div>
                </div>

                {/* Search Bar - More Discreet */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-pterosub" size={12} />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        className="pl-8 h-8 bg-[#0d1117] border-pteroborder/50 text-xs text-pterotext focus:bg-pterodark focus:border-pteroblue transition-all rounded-md"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Application Toolbar (Finder Style) - Refined */}
            <div className="bg-[#0d1117] border-b border-pteroborder p-4 flex flex-col md:flex-row gap-6 items-center justify-between backdrop-blur-sm bg-opacity-95">

                {/* Status Segmented Control - Smooth Pill Design */}
                <div className="flex items-center gap-1 p-1.5 bg-[#161b22] rounded-xl border border-white/5 shadow-inner overflow-x-auto max-w-full">
                    {[
                        { id: 'all', label: t('allStatuses') },
                        { id: 'confirmed', label: 'Confirmed' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'cancelled', label: 'Cancelled' }
                    ].map(status => (
                        <button
                            key={status.id}
                            onClick={() => setStatusFilter(status.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ease-out whitespace-nowrap",
                                statusFilter === status.id
                                    ? "bg-pteroblue text-white shadow-lg shadow-blue-500/20 scale-105"
                                    : "text-pterosub hover:text-pterotext hover:bg-white/5"
                            )}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>

                {/* Primary Actions - Floating Group */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                    {/* Date Picker (Mini) */}
                    <div className="relative group">
                        <input
                            type="date"
                            className="bg-[#161b22] border border-white/5 hover:border-pteroblue/30 text-xs text-pterotext rounded-lg px-3 py-2 h-9 outline-none transition-all w-36 shadow-sm focus:ring-2 focus:ring-pteroblue/20"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                        />
                        {dateFilter && (
                            <button
                                onClick={() => setDateFilter('')}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md hover:scale-110 transition-transform z-10"
                            >
                                <XCircle size={10} />
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-white/5 mx-2" />

                    <Button
                        variant="secondary"
                        onClick={handleDownloadPDF}
                        className="h-9 px-4 text-[11px] bg-[#161b22] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all font-bold uppercase tracking-wide gap-2 text-pterosub hover:text-pterotext rounded-lg shadow-sm"
                    >
                        <FileText size={14} /> <span className="hidden sm:inline">{t('downloadReport')}</span>
                    </Button>

                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="h-9 px-5 text-[11px] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 font-bold uppercase tracking-wide gap-2 rounded-lg transition-all hover:brightness-110 active:brightness-90"
                    >
                        <Plus size={14} strokeWidth={3} /> {t('newReservation')}
                    </Button>
                </div>
            </div>

            {/* Detail Modal Overlay */}
            <AnimatePresence>
                {isDetailOpen && selectedReservation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl bg-pterodark border border-pteroborder rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="p-6 border-b border-pteroborder flex justify-between items-center bg-pterocard/20">
                                <div>
                                    <h3 className="text-xl font-bold text-pterotext">{t('reservationDetails')}</h3>
                                    <p className="text-xs text-pterosub font-mono">ID: {selectedReservation.id} • {selectedReservation.source}</p>
                                </div>
                                <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-pteroborder/50 rounded-full text-pterosub hover:text-white transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">
                                {/* Core Info Grid (Editable) */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('mainReservationData')}</h5>
                                        {JSON.stringify(tempCoreData) !== JSON.stringify({
                                            customerName: selectedReservation.customerName,
                                            partySize: selectedReservation.partySize,
                                            date: selectedReservation.date,
                                            time: selectedReservation.time
                                        }) && (
                                                <button
                                                    onClick={async () => {
                                                        setIsSavingCore(true);
                                                        await updateReservation(selectedReservation.id, tempCoreData);
                                                        await fetchReservations(true);
                                                        setSelectedReservation({ ...selectedReservation, ...tempCoreData });
                                                        setIsSavingCore(false);
                                                    }}
                                                    disabled={isSavingCore}
                                                    className="text-[10px] font-bold text-pteroblue hover:underline flex items-center gap-1"
                                                >
                                                    {isSavingCore ? t('saving') : t('saveNotify')}
                                                </button>
                                            )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="p-3 bg-pterocard/30 border border-pteroborder/50 rounded-xl focus-within:border-pteroblue/30 transition-colors">
                                            <p className="text-[10px] font-black text-pterosub uppercase tracking-widest mb-1">{t('customer')}</p>
                                            <input
                                                type="text"
                                                className="w-full bg-transparent font-bold text-pterotext outline-none text-sm"
                                                value={tempCoreData.customerName || ''}
                                                onChange={(e) => setTempCoreData({ ...tempCoreData, customerName: e.target.value })}
                                            />
                                        </div>
                                        <div className="p-3 bg-pterocard/30 border border-pteroborder/50 rounded-xl focus-within:border-pteroblue/30 transition-colors">
                                            <p className="text-[10px] font-black text-pterosub uppercase tracking-widest mb-1">{t('people')}</p>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent font-bold text-pterotext outline-none text-sm"
                                                value={tempCoreData.partySize || ''}
                                                onChange={(e) => setTempCoreData({ ...tempCoreData, partySize: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="p-3 bg-pterocard/30 border border-pteroborder/50 rounded-xl focus-within:border-pteroblue/30 transition-colors">
                                            <p className="text-[10px] font-black text-pterosub uppercase tracking-widest mb-1">{t('date')}</p>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent font-bold text-pterotext outline-none text-sm"
                                                value={tempCoreData.date || ''}
                                                onChange={(e) => setTempCoreData({ ...tempCoreData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="p-3 bg-pterocard/30 border border-pteroborder/50 rounded-xl focus-within:border-pteroblue/30 transition-colors">
                                            <p className="text-[10px] font-black text-pterosub uppercase tracking-widest mb-1">{t('time')}</p>
                                            <input
                                                type="time"
                                                className="w-full bg-transparent font-bold text-pterotext outline-none text-sm"
                                                value={tempCoreData.time || ''}
                                                onChange={(e) => setTempCoreData({ ...tempCoreData, time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>


                                {/* Additional Commentaries Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-pteroborder/50" />
                                        <h4 className="text-[10px] font-black text-pteroblue uppercase tracking-[0.2em]">{t('additionalCommentaries')}</h4>
                                        <div className="h-px flex-1 bg-pteroborder/50" />
                                    </div>

                                    {/* Structured Data */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-[10px] font-bold text-pterosub uppercase tracking-widest">{t('aiCategorizedData')}</h5>
                                            {JSON.stringify(tempStructured) !== JSON.stringify(typeof selectedReservation.structured_commentary === 'string' ? JSON.parse(selectedReservation.structured_commentary) : (selectedReservation.structured_commentary || {})) && (
                                                <button
                                                    onClick={async () => {
                                                        setIsSavingStructured(true);
                                                        await updateReservation(selectedReservation.id, { structured_commentary: tempStructured });
                                                        await fetchReservations(true);
                                                        setSelectedReservation({ ...selectedReservation, structured_commentary: tempStructured });
                                                        setIsSavingStructured(false);
                                                    }}
                                                    disabled={isSavingStructured}
                                                    className="text-[10px] font-bold text-pteroblue hover:underline flex items-center gap-1"
                                                >
                                                    {isSavingStructured ? t('saving') : t('saveAiData')}
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(() => {
                                                const labels: any = {
                                                    occasion: "Occasion/Event",
                                                    preferences: "Seating Preferences",
                                                    allergies: "Dietary Restrictions",
                                                    special_requests: "Special Requests"
                                                };

                                                return Object.entries(labels).map(([key, label]: [string, any]) => {
                                                    let val = tempStructured[key];
                                                    const hasData = val && val !== "None" && val !== "No data" && val !== "text";

                                                    return (
                                                        <div key={key} className={cn(
                                                            "p-4 rounded-xl border transition-all bg-pterocard/10 border-pteroborder/30 focus-within:border-pteroblue/50 focus-within:bg-pteroblue/5",
                                                            hasData && "border-pteroblue/30"
                                                        )}>
                                                            <p className="text-[10px] font-bold text-pterosub uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                {hasData && <div className="w-1.5 h-1.5 bg-pteroblue rounded-full animate-pulse" />}
                                                                {label}
                                                            </p>
                                                            <input
                                                                type="text"
                                                                className="w-full bg-transparent text-sm text-pterotext font-medium outline-none placeholder:text-pterosub/50 placeholder:italic"
                                                                value={val || ''}
                                                                onChange={(e) => setTempStructured({ ...tempStructured, [key]: e.target.value })}
                                                                placeholder={t('noAdditionalInfo')}
                                                            />
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>


                                    {/* Staff Notes (Editable) */}
                                    <div className="space-y-2 pt-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-pterosub uppercase tracking-widest flex items-center gap-2">
                                                <RefreshCw size={12} className="text-yellow-400" />
                                                {t('staffNotesPriority')}
                                            </label>
                                            {tempStaffNotes !== (selectedReservation.staff_notes || '') && (
                                                <button
                                                    onClick={async () => {
                                                        setIsSavingNotes(true);
                                                        await updateReservation(selectedReservation.id, { staff_notes: tempStaffNotes });
                                                        await fetchReservations(true);
                                                        setSelectedReservation({ ...selectedReservation, staff_notes: tempStaffNotes });
                                                        setIsSavingNotes(false);
                                                    }}
                                                    disabled={isSavingNotes}
                                                    className="text-[10px] font-bold text-pteroblue hover:underline flex items-center gap-1"
                                                >
                                                    {isSavingNotes ? t('saving') : t('saveChanges')}
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            className="w-full h-24 bg-pterodark border border-pteroborder rounded-xl p-3 text-sm text-pterotext focus:border-pteroblue outline-none transition-all resize-none"
                                            placeholder={t('enterManualNotes')}
                                            value={tempStaffNotes}
                                            onChange={(e) => setTempStaffNotes(e.target.value)}
                                        />
                                    </div>

                                    {/* Raw WhatsApp Commentary (Collapsible) */}
                                    {selectedReservation.raw_commentary ? (
                                        <div className="pt-4">
                                            <details className="group">
                                                <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] font-black text-pterosub uppercase tracking-widest hover:text-pterotext transition-colors">
                                                    <MoreVertical size={12} className="group-open:rotate-90 transition-transform" />
                                                    {t('originalWhatsappConversation')}
                                                </summary>
                                                <div className="mt-3 p-4 bg-pterocard/50 border border-pteroborder/50 rounded-xl text-xs text-pterosub font-mono whitespace-pre-wrap leading-relaxed">
                                                    {selectedReservation.raw_commentary}
                                                </div>
                                            </details>
                                        </div>
                                    ) : (
                                        <div className="pt-4 p-4 border border-dashed border-pteroborder rounded-xl text-center">
                                            <p className="text-xs text-pterosub italic">{t('noAdditionalInfo')}</p>
                                        </div>
                                    )}

                                </div>
                            </div>

                            <div className="p-6 border-t border-pteroborder bg-pterocard/10 flex justify-between items-center">
                                <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
                                <div className="flex gap-2">
                                    {selectedReservation.status !== 'confirmed' && (
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => { handleStatusChange(selectedReservation.id, 'confirmed'); setIsDetailOpen(false); }}
                                        >
                                            {t('confirmBooking')}
                                        </Button>
                                    )}
                                    {selectedReservation.status !== 'cancelled' && (
                                        <Button
                                            variant="secondary"
                                            className="text-red-400 hover:bg-red-400/10 border-red-400/20"
                                            onClick={() => { handleStatusChange(selectedReservation.id, 'cancelled'); setIsDetailOpen(false); }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Modal Overlay */}
            {/* Create Sheet Overlay */}
            <Sheet
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title={t('newReservation')}
            >
                <div className="space-y-6">
                    <p className="text-sm text-pterosub mb-6">
                        Create a new manual reservation. This will trigger a sync across all connected clients.
                    </p>

                    {/* Customer Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-pteroblue" />
                            <h3 className="text-xs font-bold text-pterotext uppercase tracking-widest">{t('customer')}</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-pterosub uppercase block mb-1.5 ml-1">{t('customerName')} <span className="text-red-400">*</span></label>
                                <Input
                                    value={newRes.name}
                                    onChange={e => setNewRes({ ...newRes, name: e.target.value })}
                                    placeholder="Full Name"
                                    className="bg-pterocard/50 border-pteroborder/50 focus:border-pteroblue/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-pterosub uppercase block mb-1.5 ml-1">{t('phone')} <span className="text-red-400">*</span></label>
                                <Input
                                    value={newRes.phone}
                                    onChange={e => setNewRes({ ...newRes, phone: e.target.value })}
                                    placeholder="+1 (555) 000-0000"
                                    className="bg-pterocard/50 border-pteroborder/50 focus:border-pteroblue/50"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reservation Details */}
                    <div className="space-y-4 pt-4 border-t border-pteroborder/50">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={14} className="text-pteroblue" />
                            <h3 className="text-xs font-bold text-pterotext uppercase tracking-widest">{t('reservationDetails')}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-pterosub uppercase block mb-1.5 ml-1">{t('date')} <span className="text-red-400">*</span></label>
                                <input
                                    type="date"
                                    className="w-full bg-pterocard/50 border border-pteroborder/50 focus:border-pteroblue/50 rounded-lg px-3 py-2 text-sm text-pterotext outline-none transition-all h-10"
                                    value={newRes.date}
                                    onChange={e => setNewRes({ ...newRes, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-pterosub uppercase block mb-1.5 ml-1">{t('time')} <span className="text-red-400">*</span></label>
                                <input
                                    type="time"
                                    className="w-full bg-pterocard/50 border border-pteroborder/50 focus:border-pteroblue/50 rounded-lg px-3 py-2 text-sm text-pterotext outline-none transition-all h-10"
                                    value={newRes.time}
                                    onChange={e => setNewRes({ ...newRes, time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-pterosub uppercase block mb-1.5 ml-1">{t('people')} <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <Users size={16} className="absolute left-3 top-2.5 text-pterosub" />
                                <input
                                    type="number"
                                    className="w-full bg-pterocard/50 border border-pteroborder/50 focus:border-pteroblue/50 rounded-lg pl-10 pr-3 py-2 text-sm text-pterotext outline-none transition-all h-10"
                                    value={newRes.pax}
                                    onChange={e => setNewRes({ ...newRes, pax: parseInt(e.target.value) })}
                                    min={1}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-4 pt-4 border-t border-pteroborder/50">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={14} className="text-pteroblue" />
                            <h3 className="text-xs font-bold text-pterotext uppercase tracking-widest">{t('notes')}</h3>
                        </div>

                        <textarea
                            className="w-full bg-pterocard/50 border border-pteroborder/50 focus:border-pteroblue/50 rounded-xl px-4 py-3 text-sm text-pterotext h-32 resize-none outline-none transition-all"
                            value={newRes.notes}
                            onChange={e => setNewRes({ ...newRes, notes: e.target.value })}
                            placeholder={t('noAdditionalInfo')}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 border-t border-pteroborder flex justify-between items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                            className="flex-1 bg-transparent border border-pteroborder hover:bg-white/5"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-[2] bg-pteroblue hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
                        >
                            {t('confirm')}
                        </Button>
                    </div>
                </div>
            </Sheet>

            {/* Reservations Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-pteroborder bg-[#161b22]">
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
                                        {t('syncingBookings')}
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
                                            onClick={() => {
                                                setSelectedReservation(res);
                                                setTempStaffNotes(res.staff_notes || '');
                                                const struct = typeof res.structured_commentary === 'string'
                                                    ? JSON.parse(res.structured_commentary)
                                                    : (res.structured_commentary || {});
                                                setTempStructured(struct);
                                                setTempCoreData({
                                                    customerName: res.customerName,
                                                    partySize: res.partySize,
                                                    date: res.date,
                                                    time: res.time
                                                });
                                                setIsDetailOpen(true);
                                            }}
                                            className="p-1.5 hover:bg-pteroblue/10 text-pterosub hover:text-pteroblue rounded transition-colors"
                                            title={t('reservationDetails')}
                                        >

                                            <MoreVertical size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(res.id)}
                                            className="p-1.5 hover:bg-red-500/10 text-pterosub hover:text-red-500 rounded transition-colors"
                                            title={t('delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {/* Removed group-hover:hidden button to prevent flickering/hiding */}
                                </td>
                            </tr>
                        ))}
                    </tbody>


                </table>
            </div>
        </Card>
    );
}
