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

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const flashcardResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct', // Fast model for flashcards
        messages: [
          { 
            role: 'system', 
            content: `You are a study aid generator. Create 10-15 flashcards from the given content.

Return ONLY a JSON array with this exact format:
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]

Guidelines:
- Make questions clear and specific
- Keep answers concise but complete
- Cover key concepts, definitions, and important facts
- Vary question types (What is, How does, Why, When, etc.)
- No markdown formatting in JSON`
          },
          { 
            role: 'user', 
            content: `Create flashcards from:\n\n${summary}`
          }
        ],
      }),
    });

    if (!flashcardResponse.ok) {
      if (flashcardResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "OpenRouter rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (flashcardResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "OpenRouter credits exhausted. Please add credits at https://openrouter.ai/credits" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate flashcards');
    }

    const data = await flashcardResponse.json();
    let flashcards = [];

    try {
      const content = data.choices[0].message.content;
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      flashcards = JSON.parse(jsonMatch[1]);
    } catch (parseError) {
      console.error('Failed to parse flashcards JSON:', parseError);
      throw new Error('Failed to parse flashcard response');
    }

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-flashcards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
