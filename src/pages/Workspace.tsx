import { useState } from "react";
import { FileText, Plus, Search, Mic, Play, Map, FileBarChart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockSources = [
  { id: 1, title: "Generative AI: Overview, Benefits...", checked: true },
  { id: 2, title: "Understanding Generative AI: Cap...", checked: true },
  { id: 3, title: "Understanding Generative AI: Ho...", checked: true },
];

const Workspace = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-screen bg-background">
      {/* Sources Sidebar */}
      <div className="w-80 border-r border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-4">Sources</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button size="sm" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Discover
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4">
            <p className="text-sm font-medium mb-3">Select all sources</p>
            <div className="space-y-2">
              {mockSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={source.checked}
                    className="mt-1"
                    readOnly
                  />
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">{source.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded bg-gradient-primary flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold mb-1">
                Generative AI and Data Breach Costs in 2025
              </h1>
              <p className="text-sm text-muted-foreground">3 sources</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="prose dark:prose-invert">
              <p className="text-muted-foreground">
                This collection of documents provides a comprehensive overview of generative AI, its core technology, and its
                practical applications. It covers the fundamental principles of how generative models work to
                create new content, as well as specific implementations like ChatGPT, detailing its capabilities, development, and
                the associated ethical controversies.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                📝 Summary
              </Button>
              <Button variant="outline" size="sm">
                🗺️ MindMap
              </Button>
              <Button variant="outline" size="sm">
                🎙️ Audio Overview
              </Button>
            </div>

            <div className="mt-8">
              <div className="bg-primary/5 rounded-lg p-4 mb-2">
                <p className="text-sm">hello</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Start typing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" className="bg-gradient-primary">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">3 sources</p>
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
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Mic className="h-5 w-5" />
              <span className="text-xs">Audio Overview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Play className="h-5 w-5" />
              <span className="text-xs">Video Overview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Map className="h-5 w-5" />
              <span className="text-xs">Mind Map</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileBarChart className="h-5 w-5" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Generative AI (GenAI): A Compr...</span>
              </div>
              <p className="text-xs text-muted-foreground">Audio Overview</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Assistant Title Generation Instruct...</span>
              </div>
              <p className="text-xs text-muted-foreground">audio · 1 sources</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Generative AI (GenAI): A Comprehens...</span>
              </div>
              <p className="text-xs text-muted-foreground">audio · 3 sources</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
