import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { ProjectJSON } from "openvideo";
import { ExamplePlayer } from "./example-player";

interface ActionLayoutProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function ActionLayout({
  title,
  description,
  children,
}: ActionLayoutProps) {
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectJSON | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const slug = title
        .toLowerCase()
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
        .replace(/\s/g, "");

      setLoading(true);
      try {
        // Try to load from constants/json
        const response = await fetch(`/src/constants/json/${slug}.json`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        } else {
          console.warn(`No JSON found for example: ${slug}`);
        }
      } catch (error) {
        console.error("Error loading project JSON:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [title]);

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="flex max-w-6xl items-center gap-6 px-6 py-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 flex justify-center">
        <div>
          {/* Player Section */}
          <div className="flex flex-col gap-4">
            {/* <div className="flex items-center justify-between">
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div> */}
            <ExamplePlayer project={project} />
          </div>
        </div>
      </main>
    </div>
  );
}
