import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { whatsappApiToken, clientId, clientSecret } = body;

        // MODE 1: Validate Access Token
        if (whatsappApiToken) {
            const trimmedToken = whatsappApiToken.trim();
            const url = `https://graph.facebook.com/v21.0/me?access_token=${trimmedToken}`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.error("[WhatsApp Token Validation Error]", data);
                return NextResponse.json({ valid: false, error: data.error?.message || "Invalid Token" }, { status: 200 });
            }

            if (data.id) {
                return NextResponse.json({ valid: true, id: data.id }, { status: 200 });
            }
            return NextResponse.json({ valid: false, error: "Token did not return ID" }, { status: 200 });
        }

        // MODE 2: Validate Client Credentials
        if (clientId && clientSecret) {
            const trimmedId = clientId.trim();
            const trimmedSecret = clientSecret.trim();

            const url = `https://graph.facebook.com/oauth/access_token?client_id=${trimmedId}&client_secret=${trimmedSecret}&grant_type=client_credentials`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.access_token) {
                console.error("[WhatsApp Credentials Validation Error]", data);
                return NextResponse.json({ valid: false, error: "Invalid Client Credentials" }, { status: 200 });
            }

            return NextResponse.json({ valid: true }, { status: 200 });
        }

        return NextResponse.json({ error: 'Missing validation parameters' }, { status: 400 });

    } catch (error: any) {
        console.error("[WhatsApp Validation Route Error]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
