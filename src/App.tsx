import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/navbar";
import Home from "@/pages/home";
import AuthPage from "@/auth/authpage";
import Planner from "@/pages/planner";
import NotFound from "@/pages/notfound";
import V2Ray from "@/pages/v2ray";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/v2ray" element={<V2Ray />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Navbar />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
