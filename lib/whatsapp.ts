export async function sendWhatsAppMessage(token: string, phoneId: string, to: string, text: string) {
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
            return { success: false, error: data };
        } else {
            console.log("[WhatsApp] Message sent.");
            return { success: true, data };
        }
    } catch (err) {
        console.error("[WhatsApp Network Error]", err);
        return { success: false, error: err };
    }
}
