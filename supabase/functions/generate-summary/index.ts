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
    const { text, mode = 'standard' } = await req.json();

    if (!text) {
      throw new Error('Text is required for summarization');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const systemPrompts = {
      standard: "You are an expert educational AI that creates comprehensive, well-structured summaries. Create a clear summary with key points, main concepts, and important details.",
      simple: "You are a friendly AI teacher. Explain this content in a simple, easy-to-understand way as if teaching a beginner. Use simple language and clear examples.",
      exam: "You are an exam preparation expert. Create study notes optimized for exam preparation with key concepts, important facts, formulas, and potential exam questions."
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct', // Fast model for summaries
        messages: [
          { 
            role: 'system', 
            content: systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.standard
          },
          { 
            role: 'user', 
            content: `Please summarize the following content:\n\n${text}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "OpenRouter rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "OpenRouter credits exhausted. Please add credits at https://openrouter.ai/credits" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    // Extract key points from summary
    const keyPoints = extractKeyPoints(summary);

    return new Response(
      JSON.stringify({ summary, keyPoints }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractKeyPoints(text: string): string[] {
  const lines = text.split('\n');
  const keyPoints: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      keyPoints.push(trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''));
    }
  }
  
  return keyPoints.slice(0, 5); // Top 5 key points
}
