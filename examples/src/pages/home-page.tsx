import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Film,
  Music,
  ImageIcon,
  Type,
  Sparkles,
  ArrowRightLeft,
  Play,
  Pipette,
  Download,
} from 'lucide-react';

interface ActionCard {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  gradient: string;
}

const actions: ActionCard[] = [
  {
    title: 'Effects',
    description: 'Apply GPU-accelerated GLSL effects to any clip.',
    route: '/effects',
    icon: <Sparkles className="h-8 w-8" />,
    gradient: 'from-cyan-500/20 to-teal-600/20',
  },
  {
    title: 'Transitions',
    description: 'Smooth transitions between clips using GLSL shaders.',
    route: '/transitions',
    icon: <ArrowRightLeft className="h-8 w-8" />,
    gradient: 'from-blue-500/20 to-indigo-600/20',
  },
  {
    title: 'Animations',
    description: 'Keyframe-based animations for position, scale, and opacity.',
    route: '/animations',
    icon: <Play className="h-8 w-8" />,
    gradient: 'from-fuchsia-500/20 to-pink-600/20',
  },
  {
    title: 'Chroma Key',
    description: 'Remove green screen backgrounds in real time.',
    route: '/chromakey',
    icon: <Pipette className="h-8 w-8" />,
    gradient: 'from-lime-500/20 to-emerald-600/20',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Hero header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            OpenVideo
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A browser-native video editing engine. Explore the examples below to
            see what you can build.
          </p>
        </div>
      </header>

      {/* Card grid */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Card
              key={action.route}
              className={`group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-1 bg-linear-to-br border-border hover:border-border/40`}
              onClick={() => navigate(action.route)}
            >
              {/* Glow effect */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br from-gray-500/5 to-transparent" />

              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted/80 text-foreground transition-colors group-hover:bg-gray-500/20 group-hover:text-gray-400">
                  {action.icon}
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors">
                  Explore
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
