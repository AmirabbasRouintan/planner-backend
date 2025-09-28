import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Edit3, Check, X } from "lucide-react";

interface FormData {
  name?: string;
  email: string;
  password: string;
  password2?: string;
  username?: string;
}
 
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    password2: "",
    username: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleNameUpdate = async () => {
    if (!newName.trim()) {
      setError("Name cannot be empty");
      return;
    }

    setUpdatingName(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/auth/update-profile/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update name");
      }

      if (data.status !== 'success') {
        throw new Error(data.message || "Failed to update name");
      }

      if (user) {
        const updatedUser = { ...user, name: newName };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        document.cookie = `user=${JSON.stringify(updatedUser)}; path=/; max-age=604800`;
        login({ ...updatedUser, id: user.id, email: user.email || "" }, token || "");
      }
      
      setEditingName(false);
      setNewName("");
    } catch (err: any) {
      setError(err.message || "Failed to update name");
    } finally {
      setUpdatingName(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-full max-w-md p-8 space-y-6 bg-[var(--calendar-date-bg)] rounded-lg shadow-md border">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-center flex-1">Your Profile</h2>
            <button
              onClick={() => {
                setEditingName(true);
                setNewName(user.name || '');
                setError(null);
              }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Edit name"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-100/50 border border-red-400/50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 px-3 py-1 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <button
                        onClick={handleNameUpdate}
                        disabled={updatingName}
                        className="p-1 text-green-600 hover:text-green-700 transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNewName("");
                          setError(null);
                        }}
                        className="p-1 text-red-600 hover:text-red-700 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm"><span className="font-semibold">Name:</span> <span className="text-foreground">{user.name || 'Not provided'}</span></p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <p className="text-sm"><span className="font-semibold">Username:</span> <span className="text-foreground">{user.username}</span></p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <p className="text-sm"><span className="font-semibold">Email:</span> <span className="text-foreground">{user.email}</span></p>
              </div>
            </div>
            
            <button
              onClick={() => {
                logout();
                navigate('/home');
              }}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    
    if (id === "email" && !isSignIn) {
      const username = value.split("@")[0];
      setFormData(prev => ({ ...prev, username }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isSignIn ? "/auth/login/" : "/auth/register/";
      
      const submitData = isSignIn 
        ? { email: formData.email, password: formData.password }
        : { 
            email: formData.email, 
            password: formData.password,
            password2: formData.password,
            name: formData.name,
            username: formData.username
          };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (data.status !== 'success') {
        throw new Error(data.message || "Authentication failed");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      document.cookie = `authToken=${data.token}; path=/; max-age=604800`;
      document.cookie = `user=${JSON.stringify(data.user)}; path=/; max-age=604800`;
      
      login(data.user, data.token);
      
      navigate("/planner");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-6 bg-[var(--calendar-date-bg)] rounded-lg shadow-md border">
        <h2 className="text-3xl font-bold text-center">
          {isSignIn ? "Sign In" : "Sign Up"}
        </h2>
        
        {error && (
          <div className="p-3 bg-red-100/50 border border-red-400/50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isSignIn && (
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name"
                required={!isSignIn}
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : (isSignIn ? "Sign In" : "Sign Up")}
          </button>
        </form>
        
        <div className="text-center">
          <button
            onClick={() => {
              setIsSignIn(!isSignIn);
              setError(null);
            }}
            className="text-primary hover:underline"
            disabled={loading}
          >
            {isSignIn
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
      <div className="h-16"></div>
    </div>
  );
}