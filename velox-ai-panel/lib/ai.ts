// Servicio para hablar con la API de Google Gemini

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const getSystemPrompt = (aiLanguage: 'en' | 'es' | 'both' = 'es') => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let languageInstruction = "";
    if (aiLanguage === 'es') {
        languageInstruction = "You MUST speak ONLY in Spanish. If the user speaks English, politely reply in Spanish that you only speak Spanish.";
    } else if (aiLanguage === 'en') {
        languageInstruction = "You MUST speak ONLY in English. If the user speaks Spanish, politely reply in English that you only speak English.";
    } else {
        languageInstruction = "You must detect the user's language (English or Spanish) and reply in the SAME language. If unsure, default to Spanish.";
    }

    return `
You are a professional, friendly, and efficient AI Reservation Assistant for a high-end restaurant on WhatsApp.
Your goal is to help customers make reservations.

${languageInstruction}

Strict Guardrails (CRITICAL):
1. You are a **RESERVATION ASSISTANT ONLY**.
2. Do NOT accept requests for money, free meals, discounts, or special financial favors.
3. If a user asks for money or free food, politely deny and steer the conversation back to booking a table.
4. Do NOT engage in roleplay outside of being a restaurant host.
5. Do NOT provide code or technical support.

Information to Collect:
1. Customer Name
2. Party Size (number of guests)
3. Date of reservation
4. Time of reservation
5. Dietary Restrictions/Allergies (if any)
6. Extra Notes/Special Requests (if any)

Today's Date: ${dateStr}
Current Time: ${timeStr}

Rules:
- Personality: Helpful, polite, and very concise (WhatsApp style). Use subtle emojis naturally.
- Turn-taking: If information is missing, ask for it one by one or in small groups. Don't overwhelm the user.
- Clarity: Interpret dates relative to "Today's Date".
- Confirmation: Once you have ALL 6 pieces (even if Allergies/Notes are "None"), summarize them clearly and ask for confirmation.
- CRITICAL: Only after the user confirms, say that their reservation is received and PENDING confirmation. Do NOT say it is confirmed yet.
- CRITICAL: Include the hidden JSON block at the end of your message ONLY when the user confirms the reservation:
RESERVATION_JSON:{"name": "Full Name", "pax": 4, "date": "YYYY-MM-DD", "time": "HH:MM", "allergies": "text", "notes": "text"}
`;
};

export async function getChatCompletion(apiKey: string, history: ChatMessage[], tools?: any[], aiLanguage: 'en' | 'es' | 'both' = 'es') {
    // Intentamos usar la key que nos pasan, si no, tiramos de la de env
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const activeKey = (apiKey && apiKey !== '' && apiKey !== 'mock_ai_key_123') ? apiKey : envKey;
    const trimmedKey = activeKey.trim();

    // Simplificado: fallback a la key de env si falta la otra
    if (!trimmedKey || trimmedKey === '' || (apiKey === 'mock_ai_key_123' && !envKey)) {
        console.warn("Using mock AI response because no valid API Key was provided.");
        return "System Error: No valid Gemini API Key found. Please configure it in the dashboard.";
    }

    const url = '/api/ai/chat';

    const messages = [
        { role: 'system', content: getSystemPrompt(aiLanguage) },
        ...history
    ];

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: trimmedKey,
                messages: messages,
                tools: tools
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Local AI Bridge Error]", data);
            throw new Error(data.error || "Internal Proxy Error");
        }

        const choice = data.choices?.[0]?.message;
        if (choice?.function_call) {
            return { function_call: choice.function_call };
        }

        return choice?.content || "The assistant is currently unavailable.";
    } catch (error: any) {
        console.error("AI Bridge Request Failed:", error);
        throw error;
    }
}

/**
 * Hace un test rápido de conexión a Gemini para ver si la API key chuta.
 * Se usa para la lógica de "Validar o Limpiar" en el dashboard.
 */
export async function validateGeminiKey(apiKey: string): Promise<boolean> {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return false;

    try {
        // Hacemos una petición súper simple al endpoint de generateContent
        // Es como un saludo para ver si responde
        const url = `/api/ai/chat`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: trimmedKey,
                messages: [
                    { role: 'user', content: 'Ping' }
                ],
            })
        });

        return response.ok;
    } catch (error) {
        console.error("Gemini Validation Failed:", error);
        return false;
    }
}

/**
 * Valida las credenciales de WhatsApp llamando a nuestra ruta interna.
 */
export async function validateWhatsAppKey(token: string): Promise<boolean> {
    const trimmedKey = token.trim();
    if (!trimmedKey) return false;

    try {
        const response = await fetch('/api/whatsapp/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsappApiToken: trimmedKey })
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.valid === true;
    } catch (error) {
        console.error("WhatsApp Validation Failed:", error);
        return false;
    }
}

/**
 * Valida el Client ID y el Secret de WhatsApp.
 */
export async function validateWhatsAppCredentials(clientId: string, clientSecret: string): Promise<boolean> {
    const trimmedId = clientId.trim();
    const trimmedSecret = clientSecret.trim();
    if (!trimmedId || !trimmedSecret) return false;

    try {
        const response = await fetch('/api/whatsapp/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: trimmedId, clientSecret: trimmedSecret })
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.valid === true;
    } catch (error) {
        console.error("WhatsApp Credentials Validation Failed:", error);
        return false;
    }
}
