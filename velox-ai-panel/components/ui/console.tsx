'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/core';
import { Terminal } from 'lucide-react';

export function Console({ logs }: { logs: string[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <Card className="bg-[#0f111a] border-pteroborder flex flex-col h-[500px] p-0 overflow-hidden font-mono text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-pterocard border-b border-pteroborder text-pterosub select-none">
                <Terminal size={14} />
                <span className="text-xs font-semibold">CONTAINER / RESERVATION_BOT_V1</span>
                <div className="ml-auto flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs text-green-500">ONLINE</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 text-pterotext/80">
                {logs.map((log, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap">
                        <span className="text-blue-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
                <div className="animate-pulse">_</div>
            </div>

            <div className="p-2 bg-pterocard border-t border-pteroborder">
                <input
                    type="text"
                    placeholder="Send command to AI instance..."
                    className="w-full bg-transparent text-pterotext placeholder-pterosub/50 focus:outline-none px-2 py-1"
                    disabled
                />
            </div>
        </Card>
    );
}
