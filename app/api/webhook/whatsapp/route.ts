
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getChatCompletion, ChatMessage } from '@/lib/ai';
import { getAllServers } from '@/lib/servers';
import { checkAvailability, addReservation, findPendingReservationByPhone, updateReservation } from '@/lib/reservations';

// verify token for webhook handshake
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'velox_webhook_verify_123';

/**
 * Reconstructs ChatMessage history from raw_commentary string.
 * Expected format: "Customer: message\nAI: message\n..."
 */
function reconstructHistory(raw: string | undefined): ChatMessage[] {
    if (!raw) return [];

    const lines = raw.split('\n');
    const history: ChatMessage[] = [];

    for (const line of lines) {
        if (line.startsWith('Customer: ')) {
            history.push({ role: 'user', content: line.replace('Customer: ', '') });
        } else if (line.startsWith('AI: ')) {
            history.push({ role: 'assistant', content: line.replace('AI: ', '') });
        } else if (line.trim()) {
            // Fallback for lines without prefix (legacy)
            history.push({ role: 'user', content: line.trim() });
        }
    }

    return history;
}

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

    console.warn(`[Webhook] Unauthorized verification attempt. Mode: ${mode}, Token: ${token}`);
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

        // 0. Fetch existing reservation to get history
        const existingRes = await findPendingReservationByPhone(activeServer.id, from);
        const history: ChatMessage[] = reconstructHistory(existingRes?.raw_commentary);

        // Add current message to history
        history.push({ role: 'user', content: text });

        // 1. Initial Call with Tool Config
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

                const result = await checkAvailability(
                    activeServer.id,
                    args.date,
                    args.time,
                    args.partySize,
                    activeServer.config
                );

                console.log(`[Webhook] Tool Result:`, result);

                history.push({
                    role: 'system',
                    content: `[Tool Result for check_availability]: ${JSON.stringify(result)}. If available=false, suggest the user changes date/time.`
                });

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
        const cleanMessage = finalMessage.replace(/RESERVATION_JSON:({.*})/, '').trim();

        // 4. Extract Reservation JSON if present and save to DB
        const jsonMatch = finalMessage.match(/RESERVATION_JSON:({.*})/);

        // Update raw commentary with both Customer input and AI reply for context in next turn
        const newHistoryLine = `Customer: ${text}\nAI: ${cleanMessage}`;
        const updatedRaw = existingRes?.raw_commentary
            ? `${existingRes.raw_commentary}\n${newHistoryLine}`
            : newHistoryLine;

        if (jsonMatch) {
            try {
                const resData = JSON.parse(jsonMatch[1]);
                console.log(`[Webhook] Found reservation JSON:`, resData);

                if (existingRes) {
                    console.log(`[Webhook] Updating existing reservation ID: ${existingRes.id}`);

                    const currentStructured = typeof existingRes.structured_commentary === 'string'
                        ? JSON.parse(existingRes.structured_commentary)
                        : (existingRes.structured_commentary || {});

                    const newStructured = resData.structured || {};
                    const mergedStructured = {
                        ...currentStructured,
                        ...newStructured,
                        allergies: resData.allergies || existingRes.allergies,
                        notes: resData.notes || existingRes.notes
                    };

                    await updateReservation(existingRes.id, {
                        customerName: resData.name || existingRes.customerName,
                        partySize: Number(resData.pax) || existingRes.partySize,
                        date: resData.date || existingRes.date,
                        time: resData.time || existingRes.time,
                        raw_commentary: updatedRaw,
                        structured_commentary: mergedStructured,
                        allergies: mergedStructured.allergies,
                        notes: mergedStructured.notes
                    });
                } else {
                    // Create new reservation
                    const newRes = await addReservation({
                        userId: activeServer.userId,
                        serverId: activeServer.id,
                        customerName: resData.name,
                        customerPhone: from,
                        date: resData.date,
                        time: resData.time,
                        partySize: Number(resData.pax),
                        status: 'pending',
                        source: 'WhatsApp',
                        notes: resData.notes || '',
                        allergies: resData.allergies || '',
                        raw_commentary: updatedRaw,
                        structured_commentary: resData.structured || {},
                        staff_notes: ''
                    });
                    console.log(`[Webhook] New reservation saved with ID: ${newRes.id}`);
                }
            } catch (e) {
                console.error("[Webhook] Failed to parse/save AI reservation JSON:", e);
            }
        } else if (existingRes) {
            // Even if no JSON, update history
            await updateReservation(existingRes.id, { raw_commentary: updatedRaw });
        } else {
            // New user conversation starting, create a placeholder reservation to track history
            await addReservation({
                userId: activeServer.userId,
                serverId: activeServer.id,
                customerName: 'Pending Registration',
                customerPhone: from,
                date: '',
                time: '',
                partySize: 0,
                status: 'pending',
                source: 'WhatsApp',
                raw_commentary: updatedRaw,
                structured_commentary: {},
                staff_notes: ''
            });
        }

        // 5. Send Reply to WhatsApp
        await sendWhatsAppMessage(activeServer.whatsappApiToken, activeServer.whatsappPhoneNumberId, from, cleanMessage);

        return NextResponse.json({ status: 'processed' });
    } catch (error) {
        console.error("[Webhook Error]", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


