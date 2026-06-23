import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "./components/layout/shell";
import { AnimatePresence } from "framer-motion";
import { setExtraHeadersGetter } from "@workspace/api-client-react";

setExtraHeadersGetter(() => {
  const headers: Record<string, string> = {};
  const key = localStorage.getItem("ZG_PRIVATE_KEY");
  const rpc = localStorage.getItem("ZG_RPC_URL");
  const svc = localStorage.getItem("ZG_SERVICE_URL");
  const llmKey = localStorage.getItem("LLM_API_KEY");
  if (key) headers["x-zg-private-key"] = key;
  if (rpc) headers["x-zg-rpc-url"] = rpc;
  if (svc) headers["x-zg-service-url"] = svc;
  if (llmKey) headers["x-llm-api-key"] = llmKey;
  return headers;
});

import { Home } from "./pages/home";
import { Inference } from "./pages/inference";
import { Activity } from "./pages/activity";
import { Settings } from "./pages/settings";
import { Chat } from "./pages/chat";
import { About } from "./pages/about";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat" component={Chat} />
        <Route path="/inference" component={Inference} />
        <Route path="/activity" component={Activity} />
        <Route path="/settings" component={Settings} />
        <Route path="/about" component={About} />
        <Route>
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <h1 className="text-2xl font-mono text-muted-foreground">404 - NOT FOUND</h1>
          </div>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Shell>
            <Router />
          </Shell>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
