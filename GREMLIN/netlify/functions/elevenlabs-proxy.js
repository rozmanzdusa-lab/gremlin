/**
 * SOS Neurobot - ElevenLabs TTS Proxy (Version 3)
 * POPRAVEK: Vrednost stability nastavljena na 0.5 (Natural), da zadosti TTD zahtevam modela v3.
 */

const apiKey = process.env.ELEVENLABS_API_KEY;

// Tvoj specifičen Voice ID
const voiceId = "NOpBlnGInO9m6vDvFkFC"; 

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Metoda ni dovoljena." }) };
    }

    try {
        const { text } = JSON.parse(event.body);
        
        if (!apiKey) {
            throw new Error("V Netlify nastavitvah manjka ELEVENLABS_API_KEY.");
        }

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_v3", 
                voice_settings: {
                    /**
                     * POPRAVEK NAPAKE 'invalid_ttd_stability':
                     * Glede na loge mora biti vrednost ena izmed [0.0, 0.5, 1.0].
                     * Uporabljamo 0.5 za najbolj naraven in uravnotežen govor.
                     */
                    stability: 0.5, 
                    similarity_boost: 0.8,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("ElevenLabs Error Details:", errData);
            throw new Error(errData.detail?.message || "Napaka pri komunikaciji z ElevenLabs.");
        }

        const audioBuffer = await response.arrayBuffer();

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "audio/mpeg",
                "Access-Control-Allow-Origin": "*"
            },
            body: Buffer.from(audioBuffer).toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error("ElevenLabs Proxy Error:", error.message);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};