import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface NotebookCardProps {
  id: string;
  title: string;
  date: string;
  sources: number;
  color: string;
  icon: string;
}

const NotebookCard = ({ id, title, date, sources, color, icon }: NotebookCardProps) => {
  const navigate = useNavigate();
  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      onClick={() => navigate(`/workspace/${id}`)}
    >
      <div className={`${color} p-6 h-32 flex items-center justify-center`}>
        <span className="text-5xl">{icon}</span>
      </div>
      <div className="p-4 bg-card">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {date} • {sources} sources
        </p>
      </div>
    </Card>
  );
};

export default NotebookCard;
