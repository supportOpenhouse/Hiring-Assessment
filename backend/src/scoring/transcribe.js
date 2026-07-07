const OpenAI = require('openai');

// Transcription is isolated behind this one function so the provider can be
// swapped (e.g. to Sarvam AI for stronger Hindi) without touching the scorer.
// Default: OpenAI Whisper (whisper-1) — handles Hindi/English code-mixing well.

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function transcribeFromUrl(blobUrl, filename = 'call.m4a') {
  if (!client) throw new Error('OPENAI_API_KEY not set — cannot transcribe');

  const resp = await fetch(blobUrl);
  if (!resp.ok) throw new Error(`Could not fetch audio (${resp.status})`);
  const arrayBuf = await resp.arrayBuffer();
  const file = await OpenAI.toFile(Buffer.from(arrayBuf), filename);

  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    // Hint the model toward Hindi/English real-estate context. Whisper
    // auto-detects language; the prompt nudges spelling of common terms.
    prompt: 'Real estate call in Hindi and English. Terms: BHK, lakh, crore, carpet area, super area, broker, society, park-facing.',
    response_format: 'verbose_json',
  });

  return {
    text: result.text || '',
    language: result.language || null,
    duration: result.duration || null,
  };
}

module.exports = { transcribeFromUrl };
