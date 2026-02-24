/**
 * SOS Gremlin - Univerzalni Netlify Proxy
 * Podpira: Tekst, Klasifikacijo in TTS (Zvok)
 */

const apiKey = process.env.GEMINI_API_KEY;

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }
    
    try {
        if (!apiKey) throw new Error("GEMINI_API_KEY missing v Netlify nastavitvah");

        const body = JSON.parse(event.body);
        
        // Določimo model: Če gre za zvočne modalitete, uporabimo TTS model, sicer navaden Flash
        const isTTS = body.generationConfig?.responseModalities?.includes("AUDIO");
        const model = isTTS ? "gemini-2.5-flash-preview-tts" : "gemini-2.5-flash";
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};