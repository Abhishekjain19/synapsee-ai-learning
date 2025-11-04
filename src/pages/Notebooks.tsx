import { useState, useEffect } from "react";
import { Plus, Search, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import NotebookCard from "@/components/NotebookCard";

interface Notebook {
  id: string;
  title: string;
  created_at: string;
  icon: string;
  color: string;
  sources?: { count: number }[];
}

const Notebooks = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  const fetchNotebooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notebooks")
      .select(`
        id,
        title,
        created_at,
        icon,
        color,
        sources(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load notebooks");
      console.error(error);
    } else {
      setNotebooks(data || []);
    }
    setLoading(false);
  };

  const createNotebook = async () => {
    if (!user) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("notebooks")
      .insert({
        user_id: user.id,
        title: "Untitled Notebook",
        icon: "📓",
        color: "bg-blue-100 dark:bg-blue-950",
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast.error("Failed to create notebook");
      console.error(error);
    } else {
      toast.success("Notebook created!");
      navigate(`/workspace/${data.id}`);
    }
  };

  const filteredNotebooks = notebooks.filter((notebook) =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            NotebookLM
          </h1>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
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
            <button 
              className="group aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 disabled:opacity-50"
              onClick={createNotebook}
              disabled={creating}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {creating ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Plus className="h-6 w-6 text-primary" />
                )}
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {creating ? "Creating..." : "Create new notebook"}
              </span>
            </button>

            {filteredNotebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                id={notebook.id}
                title={notebook.title}
                date={new Date(notebook.created_at).toLocaleDateString()}
                sources={notebook.sources?.[0]?.count || 0}
                color={notebook.color}
                icon={notebook.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notebooks;
