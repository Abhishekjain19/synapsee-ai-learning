import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotebookCard from "@/components/NotebookCard";

const mockNotebooks = [
  {
    id: "1",
    title: "RAG (Retrieval Augmented Generation)",
    date: "Oct 20, 2025",
    sources: 4,
    color: "bg-blue-100 dark:bg-blue-950",
    icon: "📚",
  },
  {
    id: "2",
    title: "The impact of artificial Intelligence",
    date: "Oct 20, 2025",
    sources: 0,
    color: "bg-green-100 dark:bg-green-950",
    icon: "🤖",
  },
  {
    id: "3",
    title: "Untitled notebook",
    date: "Oct 20, 2025",
    sources: 0,
    color: "bg-purple-100 dark:bg-purple-950",
    icon: "📓",
  },
  {
    id: "4",
    title: "Dogs: Domestication, Biology, and Char...",
    date: "Sep 26, 2025",
    sources: 12,
    color: "bg-pink-100 dark:bg-pink-950",
    icon: "🐕",
  },
  {
    id: "5",
    title: "Designing a Scalable Backend in Node.j...",
    date: "Sep 26, 2025",
    sources: 10,
    color: "bg-teal-100 dark:bg-teal-950",
    icon: "⚙️",
  },
  {
    id: "6",
    title: "Generative AI and Data Breach Costs in...",
    date: "Sep 26, 2025",
    sources: 17,
    color: "bg-rose-100 dark:bg-rose-950",
    icon: "📊",
  },
  {
    id: "7",
    title: "An Overview of Retrieval-Augmented Gen...",
    date: "Sep 26, 2025",
    sources: 4,
    color: "bg-cyan-100 dark:bg-cyan-950",
    icon: "🔍",
  },
];

const Notebooks = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotebooks = mockNotebooks.filter((notebook) =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            NotebookLM
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">Recent notebooks</h2>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button className="group aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-all duration-300 flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Create new notebook
              </span>
            </button>

            {filteredNotebooks.map((notebook) => (
              <NotebookCard key={notebook.id} {...notebook} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notebooks;
