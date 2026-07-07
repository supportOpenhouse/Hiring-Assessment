const OpenAI = require('openai');
const { MAX_AUDIO_BYTES } = require('../config');

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
  // Whisper rejects >25 MB; refuse early with a clear error rather than paying
  // for the upload and getting an opaque API failure.
  const declared = Number(resp.headers.get('content-length'));
  if (declared && declared > MAX_AUDIO_BYTES) {
    throw new Error(`Audio too large to transcribe (${Math.round(declared / 1e6)} MB, max 25 MB)`);
  }
  const arrayBuf = await resp.arrayBuffer();
  if (arrayBuf.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(`Audio too large to transcribe (${Math.round(arrayBuf.byteLength / 1e6)} MB, max 25 MB)`);
  }
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
