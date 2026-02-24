/**
 * SOS Gremlin - ElevenLabs Proxy
 * Skrbi za varno generiranje škratovskega glasu
 */

const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    // Dovoli samo POST zahteve
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text, voice_id, voice_settings } = JSON.parse(event.body);
        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Manjka ELEVENLABS_API_KEY v nastavitvah Netlify." }) 
            };
        }

        // Privzet glas, če ni podan (tvoj specifičen ID za škrata)
        const targetVoiceId = voice_id || "Z7RrOqZFTyLpIlzCgfsp";

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
            method: 'POST',
            headers: {
                'accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: voice_settings || {
                    stability: 0.3,
                    similarity_boost: 0.8,
                    style: 0.45,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { 
                statusCode: response.status, 
                body: JSON.stringify(errorData) 
            };
        }

        // Pridobimo zvočne podatke
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
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};