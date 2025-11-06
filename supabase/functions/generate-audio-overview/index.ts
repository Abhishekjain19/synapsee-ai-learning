import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Convert the summary into a podcast-style dialogue between AURA and NEO
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
            content: `You are Synapse Audio Engine. Generate a podcast-style conversation between two AIs:

PARTICIPANTS:
- AURA (Curious Host) - Asks deep, engaging questions
- NEO (Expert Analyst) - Answers using insights and data

REQUIREMENTS:
1. Create 10-12 dialogue exchanges
2. AURA asks thoughtful questions about the topic
3. NEO provides expert analysis with real insights from the content
4. Keep tone conversational yet intelligent
5. Use statistics or references naturally when relevant
6. End with a reflective or motivational conclusion
7. Format EXACTLY as: "AURA: [question]" on one line and "NEO: [answer]" on the next line
8. DO NOT include emojis in the output
9. Each speaker's line should be on a separate line

Make it feel like a natural, engaging podcast conversation that educates the listener.`
          },
          { 
            role: 'user', 
            content: `Create a podcast dialogue about:\n\n${summary}`
          }
        ],
      }),
    });

    if (!dialogueResponse.ok) {
      throw new Error('Failed to generate dialogue');
    }

    const dialogueData = await dialogueResponse.json();
    const dialogue = dialogueData.choices[0].message.content;

    // Parse dialogue and generate audio for each speaker
    const lines = dialogue.split('\n').filter((line: string) => line.trim());
    const audioSegments = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      let voiceId = '';
      let text = '';

      if (trimmedLine.startsWith('AURA:') || trimmedLine.startsWith('🎙️ AURA:')) {
        voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - female voice for AURA
        text = trimmedLine.replace(/^(🎙️\s*)?AURA:\s*/, '');
      } else if (trimmedLine.startsWith('NEO:') || trimmedLine.startsWith('🤖 NEO:')) {
        voiceId = 'TX3LPaxmHKxFdv7VOQHJ'; // Liam - male voice for NEO
        text = trimmedLine.replace(/^(🤖\s*)?NEO:\s*/, '');
      }

      if (voiceId && text) {
        console.log(`Generating audio for: ${text.substring(0, 50)}...`);
        
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (!ttsResponse.ok) {
          const error = await ttsResponse.text();
          console.error('ElevenLabs API error:', error);
          throw new Error(`ElevenLabs API failed: ${error}`);
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
        
        audioSegments.push({
          speaker: voiceId === 'EXAVITQu4vr4xnSDxMaL' ? 'AURA' : 'NEO',
          text,
          audio: base64Audio,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        dialogue,
        audioSegments,
        transcript: dialogue 
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
