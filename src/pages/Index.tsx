import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, BookOpen, Mic, Map, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-float">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Learning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Learn Smarter with Synapsee
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform how you learn with AI-powered summaries, interactive mind maps, 
            and podcast-style audio. Your personalized learning companion.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link to="/notebooks">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/workspace">
              <Button size="lg" variant="outline">
                Try Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="p-6 rounded-xl bg-gradient-card backdrop-blur-sm border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Summarization</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs and documents to get intelligent, context-aware summaries instantly.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-card backdrop-blur-sm border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <Mic className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Podcast Audio</h3>
            <p className="text-sm text-muted-foreground">
              Listen to AI-generated conversational audio that makes learning engaging.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-card backdrop-blur-sm border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Mind Maps</h3>
            <p className="text-sm text-muted-foreground">
              Visualize concepts and their relationships for better recall and understanding.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-card backdrop-blur-sm border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Notebooks</h3>
            <p className="text-sm text-muted-foreground">
              Organize your learning materials in beautiful, searchable notebooks.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl bg-gradient-primary">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to transform your learning?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join students who are learning faster and smarter with Synapsee.
          </p>
          <Link to="/notebooks">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Start Learning Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
