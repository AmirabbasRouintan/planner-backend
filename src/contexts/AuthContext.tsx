import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  username: string;
  profile_picture?: string;
  is_admin?: boolean;
  is_superuser?: boolean;
  is_v2ray_admin?: boolean;
  has_v2ray_access?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isV2RayAdmin: boolean;
  hasV2RayAccess: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isV2RayAdmin, setIsV2RayAdmin] = useState<boolean>(false);
  const [hasV2RayAccess, setHasV2RayAccess] = useState<boolean>(false);

  useEffect(() => {
    let storedToken = getCookie('authToken') || localStorage.getItem('authToken');
    const storedUser = getCookie('user') || localStorage.getItem('user');
    
    if (storedToken) {
      // Ensure token has proper format
      storedToken = storedToken.startsWith('Token ') ? storedToken : `Token ${storedToken}`;
    }
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);
        const isAdminUser = userData.is_admin === true || userData.is_superuser === true;
        setIsAdmin(isAdminUser);
        setIsV2RayAdmin(isAdminUser || userData.is_v2ray_admin === true);
        setHasV2RayAccess(userData.has_v2ray_access === true);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        deleteCookie('authToken');
        deleteCookie('user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    const token = authToken.startsWith('Token ') ? authToken : `Token ${authToken}`;
    console.debug('Setting auth token:', token);
    
    setUser(userData);
    setToken(token);
    setIsAuthenticated(true);
    const isAdminUser = userData.is_admin === true || userData.is_superuser === true;
    setIsAdmin(isAdminUser);
    setIsV2RayAdmin(isAdminUser || userData.is_v2ray_admin === true);
    setHasV2RayAccess(userData.has_v2ray_access === true);
    
    setCookie('authToken', token, 7);
    setCookie('user', JSON.stringify(userData), 7);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsV2RayAdmin(false);
    setHasV2RayAccess(false);
    
    deleteCookie('authToken');
    deleteCookie('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    setCookie('user', JSON.stringify(userData), 7);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, isV2RayAdmin, hasV2RayAccess, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};