import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";
import { Cpu } from "lucide-react";

export function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/10 border border-primary flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-mono font-bold text-base tracking-tight">0G COMPUTE</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
