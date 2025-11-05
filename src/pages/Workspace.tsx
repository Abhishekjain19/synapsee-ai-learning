import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Upload, Mic, Map, FileBarChart, Send, Loader2, ArrowLeft, ExternalLink, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MindMapVisualization from "@/components/MindMapVisualization";

interface Source {
  id: string;
  title: string;
  type: string;
  content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ResearchLink {
  title: string;
  description: string;
  url: string;
  source: string;
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [researchLinks, setResearchLinks] = useState<ResearchLink[]>([]);
  const [audioOverview, setAudioOverview] = useState<string>("");
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (notebookId) {
      fetchNotebook();
      fetchSources();
      fetchResearchLinks();
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file");
      return;
    }

    setGenerating(true);
    toast.info("Extracting text from PDF...");

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke("extract-pdf-text", {
        body: formData,
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Save the extracted content as a source
      const { data: sourceData, error: sourceError } = await supabase
        .from("sources")
        .insert({
          notebook_id: notebookId,
          title: file.name,
          type: "pdf",
          content: data.text,
          file_size: file.size,
        })
        .select()
        .single();

      if (sourceError) {
        toast.error("Failed to save PDF source");
        return;
      }

      setSources([sourceData, ...sources]);
      toast.success("PDF uploaded and processed!");
      await generateSummary(data.text);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process PDF");
    } finally {
      setGenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mind-map", {
        body: { summary },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setMindMapData(data.mindMapData);

      // Save mind map to database
      await supabase.from("mind_maps").insert({
        notebook_id: notebookId,
        title: "AI Mind Map",
        data: data.mindMapData,
      });

      toast.success("Mind map generated!");
      setActiveTab("mindmap");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate mind map");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAudioOverview = async () => {
    if (!summary) {
      toast.error("Please generate a summary first");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio-overview", {
        body: { summary },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAudioOverview(data.dialogue);
      toast.success("Audio overview generated!");
      setActiveTab("audio");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate audio overview");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setMessage("");
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-document", {
        body: { 
          message: userMessage.content,
          notebookId,
          conversationHistory: chatMessages
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const assistantMessage: ChatMessage = { role: "assistant", content: data.reply };
      setChatMessages(prev => [...prev, assistantMessage]);

      // Save both messages to database
      await supabase.from("chat_messages").insert([
        { notebook_id: notebookId, role: "user", content: userMessage.content },
        { notebook_id: notebookId, role: "assistant", content: assistantMessage.content },
      ]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchResearchLinks = async () => {
    if (!notebook) return;

    try {
      const { data, error } = await supabase.functions.invoke("fetch-research-links", {
        body: { topic: notebook.title },
      });

      if (error) throw error;
      if (data.links) {
        setResearchLinks(data.links);
      }
    } catch (error) {
      console.error("Failed to fetch research links:", error);
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
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
                disabled={generating}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
              <Textarea
                placeholder="Paste your text or notes here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleAddTextSource}
                className="w-full bg-gradient-primary"
                disabled={!textInput.trim() || generating}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Text & Generate Summary
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
                <span>Generating AI content...</span>
              </div>
            )}

            {(summary || audioOverview || mindMapData) && !generating && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="summary">📝 Summary</TabsTrigger>
                  <TabsTrigger value="audio" disabled={!audioOverview}>🎙️ Audio</TabsTrigger>
                  <TabsTrigger value="mindmap" disabled={!mindMapData}>🗺️ Mind Map</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={handleGenerateMindMap} disabled={!summary}>
                        Generate Mind Map
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerateAudioOverview} disabled={!summary}>
                        Generate Audio Overview
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
                </TabsContent>

                <TabsContent value="audio">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Podcast-Style Audio Overview</h2>
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{audioOverview}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Audio playback coming soon! For now, enjoy the podcast-style transcript.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="mindmap">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Interactive Mind Map</h2>
                    {mindMapData && <MindMapVisualization data={mindMapData} />}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {chatMessages.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold">Chat History</h3>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-12"
                        : "bg-muted/50 mr-12"
                    }`}
                  >
                    <p className="font-semibold mb-1">
                      {msg.role === "user" ? "You" : "AI Tutor"}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {!summary && !generating && sources.length === 0 && (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sources yet</h3>
                <p className="text-muted-foreground">
                  Upload a PDF or add text to get started with AI-powered learning!
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
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
                disabled={chatLoading || sources.length === 0}
              />
              <Button 
                size="icon" 
                className="bg-gradient-primary"
                onClick={handleSendMessage}
                disabled={chatLoading || !message.trim() || sources.length === 0}
              >
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {sources.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Add sources to start chatting with your documents!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Research Panel */}
      <div className="w-96 border-l border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Research Links</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {researchLinks.length > 0 ? (
              researchLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">{link.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {link.description}
                      </p>
                      <p className="text-xs text-primary">{link.source}</p>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-12">
                <ExternalLink className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Research links will appear here
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Workspace;
