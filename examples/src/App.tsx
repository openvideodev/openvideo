import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/home-page";
import EffectsView from "@/pages/effects-view";
import TransitionsView from "@/pages/transitions-view";
import AnimationsView from "@/pages/animations-view";
import ChromakeyView from "@/pages/chromakey-view";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/effects" element={<EffectsView />} />
        <Route path="/transitions" element={<TransitionsView />} />
        <Route path="/animations" element={<AnimationsView />} />
        <Route path="/chromakey" element={<ChromakeyView />} />
      </Routes>{" "}
    </ThemeProvider>
  );
}

export default App;
