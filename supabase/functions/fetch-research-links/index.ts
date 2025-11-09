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
    const { topic } = await req.json();

    if (!topic) {
      throw new Error('Topic is required');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Use AI to generate relevant search queries and suggest credible sources
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct', // Fast model for research
        messages: [
          { 
            role: 'system', 
            content: 'You are a research assistant. Generate 5-7 credible educational resources for the given topic. For each resource, provide: title, description, and a realistic URL (use actual educational domains like Wikipedia, Khan Academy, MIT OpenCourseWare, etc.).'
          },
          { 
            role: 'user', 
            content: `Generate research links for: ${topic}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_research_links",
              description: "Generate research links for a topic",
              parameters: {
                type: "object",
                properties: {
                  links: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        url: { type: "string" },
                        source: { type: "string" }
                      },
                      required: ["title", "description", "url", "source"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["links"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_research_links" } }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate research links');
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const links = toolCall ? JSON.parse(toolCall.function.arguments).links : [];

    return new Response(
      JSON.stringify({ links }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-research-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
