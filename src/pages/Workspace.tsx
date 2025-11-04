import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Upload, Mic, Map, FileBarChart, Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Source {
  id: string;
  title: string;
  type: string;
  content: string;
}

const Workspace = () => {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notebook, setNotebook] = useState<any>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (notebookId) {
      fetchNotebook();
      fetchSources();
    }
  }, [notebookId]);

  const fetchNotebook = async () => {
    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .eq("id", notebookId)
      .single();

    if (error) {
      toast.error("Failed to load notebook");
      navigate("/notebooks");
    } else {
      setNotebook(data);
    }
    setLoading(false);
  };

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSources(data);
    }
  };

  const handleAddTextSource = async () => {
    if (!textInput.trim() || !user) return;

    const { data, error } = await supabase
      .from("sources")
      .insert({
        notebook_id: notebookId,
        title: textInput.substring(0, 50) + "...",
        type: "text",
        content: textInput,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add source");
    } else {
      setSources([data, ...sources]);
      setTextInput("");
      toast.success("Source added!");
      await generateSummary(textInput);
    }
  };

  const generateSummary = async (content: string) => {
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { text: content, mode: "standard" },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSummary(data.summary);
      setKeyPoints(data.keyPoints || []);

      // Save summary to database
      await supabase.from("summaries").insert({
        notebook_id: notebookId,
        title: "AI Summary",
        content: data.summary,
        key_points: data.keyPoints,
      });

      toast.success("Summary generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMindMap = async () => {
    if (!summary) {
      toast.error("Please generate a summary first");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-mind-map", {
        body: { summary },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Save mind map to database
      await supabase.from("mind_maps").insert({
        notebook_id: notebookId,
        title: "AI Mind Map",
        data: data.mindMapData,
      });

      toast.success("Mind map generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate mind map");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sources Sidebar */}
      <div className="w-80 border-r border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/notebooks")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notebooks
          </Button>
          <h2 className="font-semibold mb-4">Sources</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Paste your text or notes here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleAddTextSource}
                className="w-full bg-gradient-primary"
                disabled={!textInput.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Source & Generate Summary
              </Button>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Added Sources ({sources.length})</p>
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm line-clamp-2">{source.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">{notebook?.icon}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold mb-1">{notebook?.title}</h1>
              <p className="text-sm text-muted-foreground">{sources.length} sources</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {generating && (
              <div className="flex items-center justify-center gap-2 p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Generating AI summary...</span>
              </div>
            )}

            {summary && !generating && (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm">
                    📝 Summary
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerateMindMap}>
                    🗺️ Generate Mind Map
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    🎙️ Audio Overview (Coming Soon)
                  </Button>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <h2>AI Summary</h2>
                  <p className="whitespace-pre-wrap">{summary}</p>

                  {keyPoints.length > 0 && (
                    <>
                      <h3>Key Points</h3>
                      <ul>
                        {keyPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}

            {!summary && !generating && sources.length === 0 && (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sources yet</h3>
                <p className="text-muted-foreground">
                  Add some text or upload a document to get started with AI-powered learning!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about your sources..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled
              />
              <Button size="icon" className="bg-gradient-primary" disabled>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Chat feature coming soon!
            </p>
          </div>
        </div>
      </div>

      {/* Studio Panel */}
      <div className="w-96 border-l border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Studio</h2>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
              <Mic className="h-5 w-5" />
              <span className="text-xs">Audio Overview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
              <Map className="h-5 w-5" />
              <span className="text-xs">Mind Map</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
              <FileBarChart className="h-5 w-5" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Additional features coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
