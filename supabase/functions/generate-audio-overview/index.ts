import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function u8ToBase64(u8: Uint8Array): string {
  // Safe conversion without overwhelming call stack
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary } = await req.json();

    if (!summary) {
      throw new Error('Summary is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // 1) Generate podcast-style dialogue (AURA / NEO)
    const dialogueResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are Synapse Audio Engine. Generate a podcast-style conversation between two AIs:\n\nPARTICIPANTS:\n- AURA (Curious Host) - Asks deep, engaging questions\n- NEO (Expert Analyst) - Answers using insights and data\n\nREQUIREMENTS:\n1. Create 10-12 dialogue exchanges\n2. AURA asks thoughtful questions about the topic\n3. NEO provides expert analysis with real insights from the content\n4. Keep tone conversational yet intelligent\n5. Use statistics or references naturally when relevant\n6. End with a reflective or motivational conclusion\n7. Format EXACTLY as: "AURA: [question]" on one line and "NEO: [answer]" on the next line\n8. DO NOT include emojis in the output\n9. Each speaker's line must be on a separate line.`
          },
          { 
            role: 'user', 
            content: `Create a podcast dialogue about:\n\n${summary}`
          }
        ],
      }),
    });

    if (!dialogueResponse.ok) {
      const t = await dialogueResponse.text();
      console.error('Dialogue generation failed:', t);
      throw new Error('Failed to generate dialogue');
    }

    const dialogueData = await dialogueResponse.json();
    const dialogue: string = dialogueData.choices?.[0]?.message?.content ?? '';

    // 2) Split lines and create TTS for each
    const lines = dialogue.split('\n').filter((line: string) => line.trim().length > 0);

    const audioSegments: Array<{ speaker: 'AURA' | 'NEO'; text: string; audio: string; }> = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      let voiceId = '';
      let speaker: 'AURA' | 'NEO' | null = null;
      let text = '';

      if (/^(🎙️\s*)?AURA:/i.test(trimmedLine)) {
        voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah for AURA
        speaker = 'AURA';
        text = trimmedLine.replace(/^(🎙️\s*)?AURA:\s*/i, '');
      } else if (/^(🤖\s*)?NEO:/i.test(trimmedLine)) {
        voiceId = 'TX3LPaxmHKxFdv7VOQHJ'; // Liam for NEO
        speaker = 'NEO';
        text = trimmedLine.replace(/^(🤖\s*)?NEO:\s*/i, '');
      }

      if (!voiceId || !speaker || !text) continue;

      console.log(`Generating audio for: ${text.substring(0, 60)}...`);

      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!ttsResponse.ok) {
        const errorTxt = await ttsResponse.text();
        console.error('ElevenLabs API error:', errorTxt);
        throw new Error(`ElevenLabs API failed: ${errorTxt}`);
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      const base64Audio = u8ToBase64(new Uint8Array(audioBuffer));

      audioSegments.push({
        speaker,
        text,
        audio: base64Audio,
      });
    }

    return new Response(
      JSON.stringify({ 
        dialogue,
        audioSegments,
        transcript: dialogue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-audio-overview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
