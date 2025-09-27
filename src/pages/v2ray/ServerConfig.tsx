import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Server, 
  RefreshCw,
  Shuffle,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface V2RayConfig {
  id?: number;
  title: string;
  text: string;
}

interface V2RayFile {
  id: number;
  name: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface ServerConfigProps {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  useProxy: boolean;
  setUseProxy: (use: boolean) => void;
  connectionError: string | null;
  buildApiUrl: (endpoint: string) => string;
  updateProxyConfig: (targetUrl: string) => Promise<boolean>;
  setLoadingConfigs: (loading: boolean) => void;
  setLoadingFiles: (loading: boolean) => void;
  setConfigError: (error: string | null) => void;
  setFileError: (error: string | null) => void;
  setConfigs: (configs: V2RayConfig[]) => void;
  setFiles: (files: V2RayFile[]) => void;
  isUpdatingProxy: boolean;
}

export default function ServerConfig({
  serverUrl,
  setServerUrl,
  isConnected,
  setIsConnected,
  useProxy,
  setUseProxy,
  connectionError,
  buildApiUrl,
  updateProxyConfig,
  setLoadingConfigs,
  setLoadingFiles,
  setConfigError,
  setFileError,
  setConfigs,
  setFiles,
  isUpdatingProxy
}: ServerConfigProps) {
  return (
    <Card className="mb-4 md:mb-6 bg-[var(--calendar-date-bg)]">
      <CardHeader className="px-4 py-3 md:px-6 md:py-4">
        <CardTitle className="flex items-center text-base md:text-lg">
          <Server className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Server Configuration
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">Enter the Django server URL to connect to V2Ray management</CardDescription>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="Enter server URL (e.g., http://localhost:8000)"
              className="flex-1 h-8 md:h-10 text-xs md:text-sm"
            />
            <Button 
              className="h-8 md:h-10 text-xs md:text-sm px-3 md:px-4"
              onClick={async () => {
                if (!serverUrl) {
                  setConfigError("Please enter a server URL");
                  return;
                }

                const success = await updateProxyConfig(serverUrl);
                
                if (success) {
                  console.log(`Attempting to connect to server: ${serverUrl}`);
                  setLoadingConfigs(true);
                  setLoadingFiles(true);
                  setConfigError(null);
                  setFileError(null);
                  
                  try {
                    const configUrl = useProxy ? buildApiUrl('config') : buildApiUrl('config/');
                    const configResponse = await fetch(configUrl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      signal: AbortSignal.timeout(15000)
                    });
                    
                    if (configResponse.ok) {
                      const configData = await configResponse.json();
                      setConfigs(configData.configs || []);
                    } else {
                      throw new Error(`Failed to fetch configs: ${configResponse.status} ${configResponse.statusText}`);
                    }
                    
                    const fileUrl = useProxy ? buildApiUrl('files') : buildApiUrl('files/');
                    const fileResponse = await fetch(fileUrl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      signal: AbortSignal.timeout(15000)
                    });
                    
                    if (fileResponse.ok) {
                      const fileData = await fileResponse.json();
                      setFiles(fileData.files || []);
                    } else {
                      throw new Error(`Failed to fetch files: ${fileResponse.status} ${fileResponse.statusText}`);
                    }
                    
                    console.log('Successfully connected and fetched data from server');
                    setIsConnected(true);
                  } catch (error) {
                    console.error("Error fetching data:", error);
                    let errorMessage = "Failed to fetch data from server";
                    
                    if (error instanceof Error) {
                      if (error.name === 'AbortError') {
                        errorMessage = "Request timeout - Server may be slow or unreachable";
                      } else if (error.message.includes('fetch')) {
                        errorMessage = "Network error - Check if the server is running and accessible";
                      } else if (error.message.includes('CORS')) {
                        errorMessage = "CORS error - Server needs CORS configuration";
                      } else {
                        errorMessage = error.message;
                      }
                    }
                    
                    setConfigError(errorMessage);
                    setFileError(errorMessage);
                  } finally {
                    setLoadingConfigs(false);
                    setLoadingFiles(false);
                  }
                }
              }}
              disabled={isUpdatingProxy}
            >
              {isUpdatingProxy ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 bg-muted rounded-lg">
            <div className="flex flex-col items-start">
              <span className="text-xs md:text-sm font-medium mb-1">Connection Mode:</span>
              <div className="flex items-center">
                <span className={`text-xs md:text-sm ${useProxy ? 'text-muted-foreground' : 'font-medium'}`}>Direct</span>
                <button 
                  onClick={() => setUseProxy(!useProxy)}
                  className={`mx-1 md:mx-2 relative inline-flex h-5 md:h-6 w-9 md:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    useProxy ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`${
                      useProxy ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                    } inline-block h-3 md:h-4 w-3 md:w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
                <span className={`text-xs md:text-sm ${useProxy ? 'font-medium' : 'text-muted-foreground'}`}>Proxy</span>
              </div>
            </div>
            <div className="flex flex-col items-start ml-auto">
              <Shuffle className="w-3 h-3 md:w-4 md:h-4 self-end mb-1" />
              <span className="text-xs text-muted-foreground">
                {useProxy ? 'Using Vite proxy' : 'Direct connection to server'}
              </span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-2">
                  <Info className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Shuffle className="w-5 h-5 mr-2 text-blue-500" />
                    Connection Mode Explained
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Connection Modes</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Choose how your application connects to the V2Ray server. Different modes offer different benefits 
                      for development, testing, and production environments.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Available Modes:</h4>
                    <div className="grid gap-3">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-700 dark:text-green-400">Direct Mode</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Connects directly to your Django server. Best for:
                        </p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                          <li>• Local development environments</li>
                          <li>• Testing server connectivity</li>
                          <li>• When CORS is properly configured</li>
                          <li>• Production environments</li>
                        </ul>
                      </div>
                      
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-medium text-purple-700 dark:text-purple-400">Proxy Mode</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Uses Vite's development proxy. Best for:
                        </p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                          <li>• Development with CORS issues</li>
                          <li>• Testing different server configurations</li>
                          <li>• When direct connection fails</li>
                          <li>• Local network testing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">When to Use Each Mode</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                      <p><strong>Start with Direct Mode</strong> - It's faster and more efficient when it works.</p>
                      <p><strong>Switch to Proxy Mode</strong> if you encounter CORS errors or connection issues.</p>
                      <p><strong>For production</strong>, always use Direct Mode with proper server configuration.</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    💡 <strong>Tip:</strong> The proxy mode uses Vite's development server proxy, which is only available during development.
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="text-xs md:text-sm text-muted-foreground space-y-1">
            <p>• Enter your Django server URL with port (e.g., http://localhost:8000)</p>
            <p>• Make sure the server is running and accessible</p>
            <p>• Connection will be tested automatically when you click Connect</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
            <span className="text-muted-foreground">to {serverUrl}</span>
          </div>
          
          {connectionError && (
            <Alert variant="destructive" className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}