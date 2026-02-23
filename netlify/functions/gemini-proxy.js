/**
 * SOS Gremlin - Glavna procesna funkcija (Gemini 2.5 Flash)
 * Ta funkcija varno poveže tvoj telefon z umetno inteligenco Gemini.
 * Navodila (Master Persona) se varno naložijo iz Netlify okolja.
 */

const apiKey = process.env.GEMINI_API_KEY;
const gemPersona = process.env.GEM_PERSONA;

exports.handler = async function (event, context) {
    // Dovoli samo POST zahteve
    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: "Metoda ni dovoljena." }) 
        };
    }
    
    try {
        // Preverjanje sistemskih spremenljivk v Netlify nadzorni plošči
        if (!apiKey) throw new Error("Manjka GEMINI_API_KEY v Netlify nastavitvah.");
        if (!gemPersona) throw new Error("Manjka GEM_PERSONA v Netlify nastavitvah.");

        const incoming = JSON.parse(event.body);
        
        // Priprava podatkov za Google Gemini 2.5 Flash
        const payload = {
            contents: incoming.contents,
            systemInstruction: { 
                parts: [{ text: gemPersona }] 
            },
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1 // Nizka temperatura zagotavlja strogo sledenje JSON formatu
            }
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Napaka pri komunikaciji z AI.");
        }

        const data = await response.json();
        
        // Pridobivanje surovega besedila iz odgovora
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        /**
         * AGRESIVNO ČIŠČENJE (Varnostna varovalka):
         * Odstrani vse Markdown oznake (```json) in morebitne znake pred/za JSON objektom.
         * To prepreči napake pri JSON.parse() v tvoji index.html datoteki.
         */
        const cleanedText = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .replace(/^[^\{]*/, "") // Pobriše vse pred prvim zavitim oklepajem {
            .replace(/[^\}]*$/, "") // Pobriše vse po zadnjem zavitem oklepaju }
            .trim();

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*", 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                candidates: [{
                    content: {
                        parts: [{ text: cleanedText }]
                    }
                }]
            })
        };

    } catch (error) {
        console.error("Proxy Error:", error.message);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};