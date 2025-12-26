
import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion, ChatMessage } from '@/lib/ai';
import { getAllServers } from '@/lib/servers';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, customerName, customerPhone, status, date, time } = body;

        if (!userId || !customerPhone || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Buscamos la config del server
        const servers = await getAllServers();
        // Lo ideal sería filtrar por userId, pero siguiendo el rollo del webhook: buscamos el server que esté corriendo
        const server = (servers as any[]).find(s => s.userId === userId && s.powerStatus === 'running') ||
            (servers as any[]).find(s => s.whatsappApiToken && s.powerStatus === 'running');

        if (!server || !server.whatsappApiToken || !server.whatsappPhoneNumberId) {
            return NextResponse.json({ error: 'No active WhatsApp configuration found' }, { status: 404 });
        }

        // Generamos el mensaje con la IA
        const prompt = `
You are a helpful restaurant assistant.
A customer name ${customerName} has a reservation for ${date} at ${time}.
The status of this reservation has just been changed to: ${status.toUpperCase()}.

Task: Write a short, friendly WhatsApp message to the customer informing them of this update.
- If CONFIRMED: Say it is approved/confirmed and we look forward to seeing them.
- If CANCELLED: Say it is cancelled (apologize politely if needed, or just state it).
- Keep it under 200 characters. Use emojis.
`;

        const history: ChatMessage[] = [{ role: 'user', content: prompt }];
        // Usamos un wrapper aparte o directamente el completion. 
        // Con el getChatCompletion que tenemos va bien, pero hay que vigilar que el System Prompt no nos fastidie la tarea
        // O podríamos pasar un system prompt custom si retocamos el getChatCompletion.
        // Ahora mismo el getChatCompletion nos mete el getSystemPrompt() sí o sí.
        // *Corrección*: el getChatCompletion le pega el getSystemPrompt() delante. 
        // El de por defecto dice "Eres un asistente de reservas... ayuda a los clientes".
        // Igual se raya con esta "Tarea".
        // *Plan B*: Crear un helper `getNotificationMessage` en `lib/ai.ts` O fiarnos de que el modelo haga caso al User Instruction, que suele mandar más que el System.
        // Vamos a probar fiándonos del User Prompt, que suele tener fuerza.

        const message = await getChatCompletion(server.aiApiKey || '', history);

        // Mandamos el mensaje por WhatsApp
        const url = `https://graph.facebook.com/v21.0/${server.whatsappPhoneNumberId}/messages`;
        const whatsappRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${server.whatsappApiToken}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: customerPhone,
                type: 'text',
                text: { body: message }
            })
        });

        if (!whatsappRes.ok) {
            const errData = await whatsappRes.json();
            console.error("WhatsApp Send Failed:", errData);
            return NextResponse.json({ error: 'Failed to send WhatsApp message', details: errData }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Notification Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
