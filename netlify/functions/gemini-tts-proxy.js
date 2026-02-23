/**
 * SOS Neurobot - Glasovna funkcija (TTS)
 * Pretvori besedilo v sočuten slovenski glas.
 * Ta funkcija doda WAV glavo surovemu PCM zapisu za kompatibilnost z brskalniki.
 */
const apiKey = process.env.GEMINI_API_KEY;

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { text } = JSON.parse(event.body);
        if (!apiKey) throw new Error("Manjka GEMINI_API_KEY v Netlify nastavitvah.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ text: "Say in a calm, compassionate female voice in Slovenian: " + text }] 
                }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { 
                        voiceConfig: { 
                            prebuiltVoiceConfig: { voiceName: "Aoede" } 
                        } 
                    }
                }
            })
        });

        const result = await response.json();
        
        if (result.error) throw new Error(result.error.message);

        const inlineData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
        
        if (!inlineData || !inlineData.data) {
            throw new Error("Google ni vrnil zvočnih podatkov.");
        }

        // Gemini vrne PCM16 (L16). Brskalniki potrebujejo WAV glavo za predvajanje.
        const pcmBuffer = Buffer.from(inlineData.data, 'base64');
        const sampleRate = 24000; // Privzeta hitrost vzorčenja za Gemini TTS
        const wavBuffer = createWavHeader(pcmBuffer, sampleRate);

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "audio/wav",
                "Access-Control-Allow-Origin": "*"
            },
            body: wavBuffer.toString('base64'),
            isBase64Encoded: true
        };
    } catch (error) {
        console.error("TTS Error:", error.message);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};

/**
 * Pomožna funkcija za ustvarjanje WAV glave (header) za surove PCM podatke.
 * Brez tega brskalniki ne prepoznajo avdio zapisa.
 */
function createWavHeader(pcmBuffer, sampleRate) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM format (uncompressed)
    header.writeUInt16LE(1, 22); // Mono (1 kanal)
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28); // Byte rate (sampleRate * bitsPerSample/8)
    header.writeUInt16LE(2, 32); // Block align
    header.writeUInt16LE(16, 34); // Bits per sample (16 bit)
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
}