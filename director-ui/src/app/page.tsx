import { ChatInterface } from "@/components/chat-interface";
import { CoreProvider } from "@/components/core-provider";
import { ProjectViewer } from "@/components/project-viewer";

export default function Home() {
  // In a real app, this would come from a URL param or user session
  const projectId = "test-project-id";

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-8 bg-[#0a0a0b] selection:bg-indigo-500/30">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse [animation-delay:4s]" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <CoreProvider>
        <div className="z-10 w-full max-w-7xl flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
              Video <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Director</span>
            </h1>
            <p className="text-sm md:text-base text-zinc-400 font-medium max-w-md mx-auto">
              The next generation of AI-powered video editing. Chat with your project in real-time.
            </p>
          </div>

          <div className="w-full flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <ChatInterface projectId={projectId} />
            </div>
            <div className="flex-1">
              <ProjectViewer />
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Documentation</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Support</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Privacy</span>
          </div>
        </div>
      </CoreProvider>
    </main>
  );
}
