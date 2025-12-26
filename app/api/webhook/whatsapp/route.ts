
import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion, ChatMessage } from '@/lib/ai';
import { getAllServers } from '@/lib/servers';
import { checkAvailability, addReservation } from '@/lib/reservations';

// verify token for webhook handshake
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'velox_webhook_verify_123';

/**
 * Handle Webhook Verification Challenge (GET)
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("[Webhook] Verified successfully.");
        return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse('Forbidden', { status: 403 });
}

const AVAILABILITY_TOOL = {
    function_declarations: [{
        name: "check_availability",
        description: "Check if the restaurant has available seats for a specific date and time. Use this BEFORE confirming any reservation.",
        parameters: {
            type: "OBJECT",
            properties: {
                date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                time: { type: "STRING", description: "Time in HH:MM format" },
                partySize: { type: "INTEGER", description: "Number of guests" }
            },
            required: ["date", "time", "partySize"]
        }
    }]
};

/**
 * Handle Incoming Messages (POST)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check if it's a WhatsApp status update or message
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) {
            // Just a status update (sent/delivered/read), ignore for now
            return NextResponse.json({ status: 'ignored' });
        }

        const from = message.from; // User's phone number
        const text = message.text?.body; // Message content
        const phoneId = value?.metadata?.phone_number_id; // Receiver phone ID

        console.log(`[Webhook] Message from ${from} to ID ${phoneId}: ${text}`);

        // Find server configuration for this specific Phone Number ID
        const servers = await getAllServers();
        let activeServer = servers.find(s =>
            s.whatsappPhoneNumberId === phoneId &&
            s.powerStatus === 'running' &&
            s.status === 'active'
        );

        // Fallback for legacy or misconfigured IDs if only one server is running
        if (!activeServer) {
            activeServer = servers.find(s => s.whatsappApiToken && s.whatsappApiToken.length > 10 && s.powerStatus === 'running' && s.status === 'active');
        }

        if (!activeServer || !activeServer.whatsappApiToken || !activeServer.whatsappPhoneNumberId) {
            console.error("[Webhook] No active server matched for this request.");
            return NextResponse.json({ status: 'no_server_config' });
        }

        // 1. Initial Call with Tool Config
        const history: ChatMessage[] = [
            { role: 'user', content: text }
        ];

        let aiResponse = await getChatCompletion(
            activeServer.aiApiKey || '',
            history,
            [AVAILABILITY_TOOL],
            activeServer.config?.aiLanguage || 'es'
        );

        // 2. Handle Tool Call Loop (One turn for now)
        if (typeof aiResponse === 'object' && aiResponse.function_call) {
            const fc = aiResponse.function_call;
            console.log(`[Webhook] AI requested tool execution: ${fc.name}`);

            if (fc.name === 'check_availability') {
                const args = fc.args; // Access direct args from Gemini JSON

                // Execute logic
                const result = await checkAvailability(
                    activeServer.id, // use server ID for isolation
                    args.date,
                    args.time,
                    args.partySize,
                    activeServer.config
                );

                console.log(`[Webhook] Tool Result:`, result);

                // Feed back to AI
                // Note: In a full stateful chat, we'd send 'function_response'. 
                // Here we simulate by adding a System observation to the history.
                history.push({
                    role: 'system',
                    content: `[Tool Result for check_availability]: ${JSON.stringify(result)}. If available=false, suggest the user changes date/time.`
                });

                // Call again without tools (or with tools, but we expect a text reply this time)
                aiResponse = await getChatCompletion(
                    activeServer.aiApiKey || '',
                    history,
                    undefined,
                    activeServer.config?.aiLanguage || 'es'
                );
            }
        }

        // 3. Final Text Response
        const finalMessage = typeof aiResponse === 'string' ? aiResponse : "Sorry, I encountered an error processing your request.";

        // 4. Extract Reservation JSON if present and save to DB
        const jsonMatch = finalMessage.match(/RESERVATION_JSON:({.*})/);
        if (jsonMatch) {
            try {
                const resData = JSON.parse(jsonMatch[1]);
                console.log(`[Webhook] Found reservation JSON:`, resData);

                // Add to database
                const newRes = await addReservation({
                    userId: activeServer.userId,
                    serverId: activeServer.id,
                    customerName: resData.name,
                    customerPhone: from, // Use the real WhatsApp number
                    date: resData.date,
                    time: resData.time,
                    partySize: Number(resData.pax),
                    status: 'pending', // Webhook reservations are usually pending until admin confirms
                    source: 'WhatsApp'
                });

                console.log(`[Webhook] Reservation saved with ID: ${newRes.id}`);
            } catch (e) {
                console.error("[Webhook] Failed to parse/save AI reservation JSON:", e);
            }
        }

        // 5. Send Reply to WhatsApp (Clean message without JSON)
        const cleanMessage = finalMessage.replace(/RESERVATION_JSON:({.*})/, '').trim();
        await sendWhatsAppMessage(activeServer.whatsappApiToken, activeServer.whatsappPhoneNumberId, from, cleanMessage);

        return NextResponse.json({ status: 'processed' });
    } catch (error) {
        console.error("[Webhook Error]", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function sendWhatsAppMessage(token: string, phoneId: string, to: string, text: string) {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: text }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("[WhatsApp Send Error]", data);
        } else {
            console.log("[WhatsApp] Reply sent.");
        }
    } catch (err) {
        console.error("[WhatsApp Network Error]", err);
    }
}
