import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, notebookId, conversationHistory } = await req.json();

    if (!message || !notebookId) {
      throw new Error('Message and notebookId are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all sources from the notebook for context
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('content, title')
      .eq('notebook_id', notebookId);

    if (sourcesError) throw sourcesError;

    // Fetch recent summaries for context
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('content')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (summariesError) throw summariesError;

    // Build context from sources and summaries
    const context = [
      ...sources.map(s => `Source: ${s.title}\n${s.content}`),
      ...summaries.map(s => s.content)
    ].join('\n\n---\n\n');

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Build conversation messages
    const messages = [
      { 
        role: 'system', 
        content: `You are an AI tutor helping students learn from their uploaded materials. Answer questions based on the provided context. Be helpful, clear, and educational.\n\nContext:\n${context}`
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o', // Best for interactive chat
        messages,
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
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
