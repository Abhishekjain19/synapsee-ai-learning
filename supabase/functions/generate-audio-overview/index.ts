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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // First, convert the summary into a podcast-style dialogue
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
            content: 'You are an expert at creating engaging podcast-style dialogues. Convert the given content into a natural conversation between two hosts discussing the topic. Make it educational, engaging, and easy to follow.'
          },
          { 
            role: 'user', 
            content: `Convert this summary into a podcast dialogue:\n\n${summary}`
          }
        ],
      }),
    });

    if (!dialogueResponse.ok) {
      throw new Error('Failed to generate dialogue');
    }

    const dialogueData = await dialogueResponse.json();
    const dialogue = dialogueData.choices[0].message.content;

    // Use ElevenLabs-style TTS (we'll use a simple approach for now)
    // In production, you'd integrate with ElevenLabs API
    return new Response(
      JSON.stringify({ 
        dialogue,
        audioUrl: null, // Placeholder - would be the actual audio URL
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
