/**
 * SOS Gremlin - Netlify Proxy Funkcija
 * POSODOBLJENA VERZIJA: Podpira prenos polnih sistemskih navodil.
 */

const apiKey = process.env.GEMINI_API_KEY;

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }
    
    try {
        if (!apiKey) throw new Error("GEMINI_API_KEY missing");

        const body = JSON.parse(event.body);
        
        // Združimo frontend sistemska navodila s tistimi iz okolja (če obstajajo)
        const systemInstruction = body.systemInstruction || { parts: [{ text: "Si SOS asistent." }] };

        const payload = {
            contents: body.contents,
            systemInstruction: systemInstruction,
            generationConfig: body.generationConfig || {
                responseMimeType: "application/json",
                temperature: 0.1 
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "AI API Error");
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Proxy Error:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};