import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/navbar";
import Lightning from "@/components/Lightning";
import Home from "@/pages/home";
import AuthPage from "@/auth/authpage";
import Planner from "@/pages/planner";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/notfound";
import V2Ray from "@/pages/v2ray";
import Settings from "@/pages/Settings";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="relative min-h-screen">
          <Lightning hue={220} xOffset={0} speed={1} intensity={1} size={1} />
          <div style={{ position: "relative" }}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/v2ray" element={<V2Ray />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            <Navbar />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
