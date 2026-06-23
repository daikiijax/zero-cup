import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { Activity, Cpu, LayoutDashboard, Settings, X } from "lucide-react";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const isHealthy = health?.status === "ok";

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inference", label: "Inference", icon: Cpu },
    { href: "/activity", label: "Activity Logs", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 w-64 border-r border-border bg-card flex flex-col z-30",
        "transition-transform duration-200 ease-in-out",
        // Mobile: slide in/out. Desktop: always visible.
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <span className="font-mono font-bold text-lg tracking-tight">0G COMPUTE</span>
        </div>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden p-1 rounded text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border border-border">
          <span className="text-xs font-mono text-muted-foreground">SYSTEM STATUS</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{isHealthy ? "ONLINE" : "OFFLINE"}</span>
            <div className={`w-2 h-2 rounded-full ${isHealthy ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          </div>
        </div>
      </div>
    </aside>
  );
}
