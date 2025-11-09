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
    const { summary, researchLinks, topic } = await req.json();

    if (!summary && !topic) {
      throw new Error('Summary or topic is required');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Prepare references from research links
    const references = researchLinks?.map((link: any, index: number) => 
      `[${index + 1}] ${link.title} - ${link.url}`
    ).join('\n') || '';

    const reportResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { 
            role: 'system', 
            content: `You are Synapse Report Generator.
Generate a structured academic-style report including:

1. **Title** - Clear and descriptive
2. **Abstract** (3-4 lines) - Brief overview
3. **Problem Statement** - What challenge or question is being addressed
4. **Key Findings or Concepts** - Main insights (use bullet points)
5. **Conclusion** - Summary and implications
6. **References** - Cite provided research links

Use clean, formal, research-friendly tone. Format with proper markdown for readability.`
          },
          { 
            role: 'user', 
            content: `Generate a report based on:\n\nContent: ${summary || topic}\n\nAvailable References:\n${references}`
          }
        ],
      }),
    });

    if (!reportResponse.ok) {
      if (reportResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (reportResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate report');
    }

    const reportData = await reportResponse.json();
    const report = reportData.choices[0].message.content;

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
