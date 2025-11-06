import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Upload, Send, Loader2, ArrowLeft, ExternalLink, FileUp, FileDown, CheckSquare, Volume2 } from "lucide-react";
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
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set());
  const [audioOverview, setAudioOverview] = useState<{dialogue: string; audioSegments: any[]; providerError?: string | null} | null>(null);
  const [generatingSegments, setGeneratingSegments] = useState<Set<number>>(new Set());
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [report, setReport] = useState<string>("");
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
    if (!summary && selectedLinks.size === 0) {
      toast.error("Please generate a summary or select research links first");
      return;
    }

    setGenerating(true);
    try {
      // Use selected research links or summary
      const content = selectedLinks.size > 0
        ? researchLinks
            .filter((_, idx) => selectedLinks.has(idx))
            .map(link => `${link.title}: ${link.description}`)
            .join('\n\n')
        : summary;

      const { data, error } = await supabase.functions.invoke("generate-mind-map", {
        body: { summary: content },
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

  const handleGenerateReport = async () => {
    if (!summary) {
      toast.error("Please generate a summary first");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { 
          summary, 
          researchLinks,
          topic: notebook?.title 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setReport(data.report);
      toast.success("Report generated!");
      setActiveTab("report");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const toggleLinkSelection = (idx: number) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedLinks(newSelected);
  };

  const handleGenerateAudioOverview = async () => {
    if (!summary) {
      toast.error("Please generate a summary first");
      return;
    }

    setGenerating(true);
    setAudioOverview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio-overview", {
        body: { summary },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAudioOverview({
        dialogue: data.dialogue,
        audioSegments: data.audioSegments || [],
        providerError: data.providerError || null,
      });

      const failedCount = (data.audioSegments || []).filter((s: any) => s.status === 'failed').length;
      const successCount = (data.audioSegments || []).filter((s: any) => s.status === 'success').length;

      if (failedCount > 0 && successCount > 0) {
        toast.warning(`Generated ${successCount} segments, ${failedCount} failed (you can retry them)`);
      } else if (failedCount > 0) {
        toast.warning("All segments failed to generate. You can retry them individually.");
      } else if (data.providerError) {
        toast.warning("Audio provider limited: showing transcript only.");
      } else {
        toast.success("Audio overview generated!");
      }
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

            {(summary || audioOverview || mindMapData || report) && !generating && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="summary">📝 Summary</TabsTrigger>
                  <TabsTrigger value="report" disabled={!report}>📄 Report</TabsTrigger>
                  <TabsTrigger value="audio" disabled={!audioOverview}>🎙️ Podcast</TabsTrigger>
                  <TabsTrigger value="mindmap" disabled={!mindMapData}>🗺️ Mind Map</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={!summary}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerateMindMap} disabled={!summary && selectedLinks.size === 0}>
                        🧠 Generate Mind Map
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerateAudioOverview} disabled={!summary}>
                        🎧 Generate Podcast
                      </Button>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                      <div className="mb-6">
                        <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                          🧠 {notebook?.title}
                        </h1>
                        <div className="text-lg leading-relaxed">
                          {summary.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx} className="mb-4">{paragraph}</p>
                          ))}
                        </div>
                      </div>

                      {keyPoints.length > 0 && (
                        <div className="bg-accent/20 rounded-lg p-6 border border-border">
                          <h3 className="text-xl font-semibold mb-4">📊 Key Points</h3>
                          <ul className="space-y-2">
                            {keyPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="text-primary mt-1">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="report">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold">📄 Research Report</h2>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([report], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${notebook?.title || 'report'}.md`;
                          a.click();
                          toast.success("Report downloaded!");
                        }}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none bg-card border border-border rounded-lg p-8">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: report.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                        }} 
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audio">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-6">🎙️ AI Podcast: AURA × NEO</h2>
                    
                    <div className="flex gap-4 mb-6">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-sm font-medium">AURA - Curious Host</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
                        <div className="h-3 w-3 rounded-full bg-secondary animate-pulse"></div>
                        <span className="text-sm font-medium">NEO - Expert Analyst</span>
                      </div>
                    </div>

                     {audioOverview?.audioSegments && audioOverview.audioSegments.length > 0 && (
                      <div className="mb-6 bg-muted/30 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Volume2 className="h-5 w-5" />
                          Audio Podcast
                        </h3>
                        <div className="space-y-3">
                          {audioOverview.audioSegments.map((segment: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full ${segment.speaker === 'AURA' ? 'bg-primary' : 'bg-secondary'} flex items-center justify-center flex-shrink-0 text-sm`}>
                                  {segment.speaker === 'AURA' ? '🎙️' : '🤖'}
                                </div>
                                {segment.status === 'success' && segment.audio ? (
                                  <audio 
                                    controls 
                                    className="flex-1"
                                    src={`data:audio/mpeg;base64,${segment.audio}`}
                                  />
                                ) : segment.status === 'failed' ? (
                                  <div className="flex-1 flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                                    <span className="text-sm text-destructive flex-1">Failed to generate audio: {segment.error}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        setGeneratingSegments(prev => new Set(prev).add(idx));
                                        try {
                                          const { data, error } = await supabase.functions.invoke("generate-single-segment", {
                                            body: { speaker: segment.speaker, text: segment.text },
                                          });
                                          if (error) throw error;
                                          if (data.error) throw new Error(data.error);
                                          
                                          setAudioOverview(prev => {
                                            if (!prev) return prev;
                                            const newSegments = [...prev.audioSegments];
                                            newSegments[idx] = {
                                              speaker: segment.speaker,
                                              text: segment.text,
                                              audio: data.audio,
                                              status: 'success',
                                            };
                                            return { ...prev, audioSegments: newSegments };
                                          });
                                          toast.success("Segment regenerated!");
                                        } catch (error) {
                                          console.error(error);
                                          toast.error("Failed to retry segment");
                                        } finally {
                                          setGeneratingSegments(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(idx);
                                            return newSet;
                                          });
                                        }
                                      }}
                                      disabled={generatingSegments.has(idx)}
                                    >
                                      {generatingSegments.has(idx) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Retry"
                                      )}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              {generatingSegments.has(idx) && (
                                <div className="ml-11 h-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary animate-pulse w-3/4"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {audioOverview?.dialogue && (
                      <div className="bg-gradient-to-br from-card to-muted/30 rounded-lg p-6 border border-border">
                        <h3 className="font-semibold text-lg mb-4">Transcript</h3>
                        <div className="space-y-4">
                          {audioOverview.dialogue.split('\n').map((line, idx) => {
                            if (line.includes('AURA:')) {
                              return (
                                <div key={idx} className="flex gap-3 items-start">
                                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                    🎙️
                                  </div>
                                  <div className="flex-1 bg-primary/5 rounded-lg p-4">
                                    <p className="font-medium text-primary mb-1">AURA</p>
                                    <p>{line.replace(/🎙️\s*AURA:\s*/i, '')}</p>
                                  </div>
                                </div>
                              );
                            } else if (line.includes('NEO:')) {
                              return (
                                <div key={idx} className="flex gap-3 items-start">
                                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                    🤖
                                  </div>
                                  <div className="flex-1 bg-secondary/5 rounded-lg p-4">
                                    <p className="font-medium text-secondary mb-1">NEO</p>
                                    <p>{line.replace(/🤖\s*NEO:\s*/i, '')}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="mindmap">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-4">🗺️ Interactive Mind Map</h2>
                    {selectedLinks.size > 0 && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Generated from {selectedLinks.size} selected research link{selectedLinks.size > 1 ? 's' : ''}
                      </p>
                    )}
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Research Links</h2>
            {selectedLinks.size > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                {selectedLinks.size} selected
              </span>
            )}
          </div>
          {researchLinks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Select links to include in mind map
            </p>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {researchLinks.length > 0 ? (
              researchLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleLinkSelection(idx)}
                      className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedLinks.has(idx)
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30 hover:border-primary'
                      }`}
                    >
                      {selectedLinks.has(idx) && <CheckSquare className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 group"
                      >
                        <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary group-hover:text-primary/80" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {link.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {link.description}
                          </p>
                          <p className="text-xs text-primary">{link.source}</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
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
