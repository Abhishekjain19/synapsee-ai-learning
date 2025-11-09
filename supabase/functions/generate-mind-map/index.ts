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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Structured output model
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating mind map structures. Generate a hierarchical JSON structure for a mind map based on the given content. Return ONLY valid JSON with no additional text.'
          },
          { 
            role: 'user', 
            content: `Create a mind map structure from this summary. Return JSON in this exact format:
{
  "name": "Main Topic",
  "children": [
    {
      "name": "Subtopic 1",
      "children": [
        {"name": "Detail 1"},
        {"name": "Detail 2"}
      ]
    }
  ]
}

Summary: ${summary}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_mind_map",
              description: "Create a hierarchical mind map structure",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  children: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        children: { type: "array" }
                      }
                    }
                  }
                },
                required: ["name", "children"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_mind_map" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate mind map');
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const mindMapData = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!mindMapData) {
      throw new Error('Failed to parse mind map data');
    }

    return new Response(
      JSON.stringify({ mindMapData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-mind-map:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
