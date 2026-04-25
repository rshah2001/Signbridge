import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import LandingPage from "@/pages/LandingPage";
import StudioPage from "@/pages/StudioPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AboutPage from "@/pages/AboutPage";

function App() {
  return (
    <div className="App flex min-h-screen flex-col bg-[#F7F5F0] text-[#1F2421]">
      <BrowserRouter>
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
