import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, messages, model = 'gemini-1.5-flash' } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
        }

        // Extract system instruction and filter messages
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const chatMessages = messages.filter((m: any) => m.role !== 'system');

        // Map roles for Gemini and ENSURE it starts with 'user'
        const rawContents = chatMessages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Gemini REQUIREMENT: History MUST start with a 'user' message.
        // If the first message is 'model' (from the initial assistant greeting), we remove it.
        const contents = rawContents.length > 0 && rawContents[0].role === 'model'
            ? rawContents.slice(1)
            : rawContents;

        if (contents.length === 0) {
            return NextResponse.json({ error: 'No user messages to process' }, { status: 400 });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey.trim()}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemMsg?.content || '' }]
                },
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                tools: body.tools || undefined
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Proxy Gemini Error Details]", JSON.stringify(data, null, 2));
            const errorMsg = data.error?.message || "Gemini API Error";
            return NextResponse.json({
                error: errorMsg
            }, { status: response.status });
        }

        // Map Gemini response back into a generic format the frontend expects
        const candidate = data.candidates?.[0];
        const content = candidate?.content;
        const text = content?.parts?.[0]?.text || "";
        const functionCall = content?.parts?.[0]?.functionCall;

        return NextResponse.json({
            choices: [{
                message: {
                    content: text,
                    function_call: functionCall
                }
            }]
        });
    } catch (error: any) {
        console.error("[Gemini Route Error]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
