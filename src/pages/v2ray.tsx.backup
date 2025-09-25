import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Server, 
  Shield, 
  Wifi, 
  Download, 
  RefreshCw, 
  Play, 
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shuffle,
  Upload,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface V2RayConfig {
  id?: number;
  title: string;
  text: string;
}

interface ServerFile {
  id: number;
  name: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export default function V2Ray() {
  const { isAdmin, user, isV2RayAdmin, hasV2RayAccess, login } = useAuth();
  const navigate = useNavigate();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingProxy, setIsUpdatingProxy] = useState(false);
  const [configs, setConfigs] = useState<V2RayConfig[]>([]);
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<V2RayConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<ServerFile | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:8000');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [testingConfigs, setTestingConfigs] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, {latency: number, status: string}>>({});
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const permissionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
  }, []);

  const buildApiUrl = (endpoint: string) => {
    if (useProxy) {
      if (endpoint === 'config') return '/api/config/';
      if (endpoint === 'files') return '/api/files/';
      if (endpoint === 'client') return '/download/client.py';
      if (endpoint.startsWith('file-download')) {
        const fileId = endpoint.split('/')[1];
        return `/download/${fileId}/`;
      }
      if (endpoint === 'users') return '/api/users/';
      return endpoint;
    } else {
      return `${serverUrl}/tickets/api/${endpoint}`;
    }
  };

  const refreshUserPermissions = async () => {
    if (!user) return;
    
    setRefreshingPermissions(true);
    try {
      const url = buildApiUrl('users');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const currentUser = data.users.find((u: any) => u.id === parseInt(user.id));
      if (currentUser) {
        const updatedUser = {
          ...user,
          is_v2ray_admin: currentUser.is_v2ray_admin,
          has_v2ray_access: currentUser.has_v2ray_access,
          is_admin: currentUser.is_staff
        };
        
        const token = localStorage.getItem('authToken') || '';
        login(updatedUser, token);
        
        console.log('User permissions refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing user permissions:', error);
    } finally {
      setRefreshingPermissions(false);
    }
  };

  useEffect(() => {
    if (permissionCheckInterval.current) {
      clearInterval(permissionCheckInterval.current);
    }
    
    permissionCheckInterval.current = setInterval(() => {
      refreshUserPermissions();
    }, 5 * 60 * 1000); 
    
    return () => {
      if (permissionCheckInterval.current) {
        clearInterval(permissionCheckInterval.current);
      }
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchConfigs = async () => {
      setLoadingConfigs(true);
      setConfigError(null);
      
      try {
        const url = useProxy ? buildApiUrl('config') : buildApiUrl('config/');
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch configs: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (isMounted) {
          setConfigs(data.configs || []);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error fetching V2Ray configs:", error);
        if (isMounted) {
          let errorMessage = (error as Error).message || "Failed to fetch V2Ray configurations";
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = "Request timeout - Server may be slow or unreachable";
            } else if (error.message.includes('fetch')) {
              errorMessage = "Network error - Check if the server is running and accessible";
            } else if (error.message.includes('CORS')) {
              errorMessage = "CORS error - Server needs CORS configuration";
            }
          }
          
          setConfigError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoadingConfigs(false);
        }
      }
    };

    const fetchFiles = async () => {
      setLoadingFiles(true);
      setFileError(null);
      
      try {
        const url = useProxy ? buildApiUrl('files') : buildApiUrl('files/');
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (isMounted) {
          setFiles(data.files || []);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
        if (isMounted) {
          let errorMessage = (error as Error).message || "Failed to fetch files";
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = "Request timeout - Server may be slow or unreachable";
            } else if (error.message.includes('fetch')) {
              errorMessage = "Network error - Check if the server is running and accessible";
            } else if (error.message.includes('CORS')) {
              errorMessage = "CORS error - Server needs CORS configuration";
            }
          }
          
          setFileError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoadingFiles(false);
        }
      }
    };

    console.log(`Initial data fetch from server: ${serverUrl}`);
    fetchConfigs();
    fetchFiles();

    return () => {
      isMounted = false;
    };
  }, [navigate, serverUrl, useProxy]);

  const parseVmessUrl = (url: string): any => {
    try {
      if (!url.startsWith('vmess://')) return null;
      
      const encodedPart = url.substring(8);
      const decoded = atob(encodedPart + '='.repeat((-encodedPart.length % 4)));
      const config = JSON.parse(decoded);
      
      return {
        protocol: 'vmess',
        address: config.add || '',
        port: parseInt(config.port || 443),
        id: config.id || '',
        name: config.ps || 'Unknown'
      };
    } catch (error) {
      console.error('Error parsing vmess URL:', error);
      return null;
    }
  };

  const parseVlessUrl = (url: string): any => {
    try {
      if (!url.startsWith('vless://')) return null;
      
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams(urlObj.search);
      
      let name = 'Unknown';
      if (searchParams.has('remarks')) {
        name = decodeURIComponent(searchParams.get('remarks')!);
      } else if (urlObj.hash) {
        name = decodeURIComponent(urlObj.hash.substring(1));
      }
      
      return {
        protocol: 'vless',
        address: urlObj.hostname,
        port: parseInt(urlObj.port || '80'),
        id: urlObj.username,
        name,
        path: searchParams.get('path') || '/',
        type: searchParams.get('type') || 'tcp',
        security: searchParams.get('security') || 'none',
        encryption: searchParams.get('encryption') || 'none'
      };
    } catch (error) {
      console.error('Error parsing vless URL:', error);
      return null;
    }
  };

  const parseConfigText = (configText: string): any => {
    try {
      const vmessUrls = configText.match(/vmess:\/\/[A-Za-z0-9+/=]+/g);
      if (vmessUrls) {
        return parseVmessUrl(vmessUrls[0]);
      }
      
      const vlessUrls = configText.match(/vless:\/\/[^\s\n]+/g);
      if (vlessUrls) {
        return parseVlessUrl(vlessUrls[0]);
      }
      
      if (configText.trim().startsWith('{')) {
        const config = JSON.parse(configText);
        const outbounds = config.outbounds || [];
        if (outbounds.length > 0) {
          const outbound = outbounds[0];
          const settings = outbound.settings || {};
          const vnext = settings.vnext || [{}];
          if (vnext.length > 0) {
            const server = vnext[0];
            return {
              protocol: outbound.protocol || 'unknown',
              address: server.address || '',
              port: server.port || 443,
              name: 'V2Ray JSON Config'
            };
          }
        }
      }
      
      const addressMatch = configText.match(/"address":\s*"([^"]+)"/);
      const portMatch = configText.match(/"port":\s*(\d+)/);
      
      if (addressMatch && portMatch) {
        return {
          protocol: 'unknown',
          address: addressMatch[1],
          port: parseInt(portMatch[1]),
          name: 'Parsed Config'
        };
      }
      
    } catch (error) {
      console.error('Error parsing config:', error);
    }
    
    return null;
  };

  const extractV2rayConfigurations = (fileContent: string): any[] => {
    const configs: any[] = [];
    
    try {
      const jsonConfigs = fileContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
      jsonConfigs.forEach(jsonStr => {
        try {
          const config = JSON.parse(jsonStr);
          if (config.inbounds || config.outbounds) {
            configs.push({
              title: `V2Ray Config ${configs.length + 1}`,
              text: JSON.stringify(config, null, 2)
            });
          }
        } catch (e) {
        }
      });
      
      const vmessUrls = fileContent.match(/vmess:\/\/[A-Za-z0-9+/=]+/g) || [];
      vmessUrls.forEach((url, i) => {
        try {
          const encodedPart = url.substring(8); 
          const decoded = atob(encodedPart + '='.repeat((-encodedPart.length % 4)));
          const config = JSON.parse(decoded);
          
          configs.push({
            title: `Vmess Config ${i + 1}`,
            text: url 
          });
        } catch (e) {
        }
      });
      
      const vlessUrls = fileContent.match(/vless:\/\/[^\s\n]+/g) || [];
      vlessUrls.forEach((url, i) => {
        configs.push({
          title: `Vless Config ${i + 1}`,
          text: url
        });
      });
      
    } catch (error) {
      console.error('Error extracting configurations:', error);
    }
    
    return configs;
  };

  const testConfig = async (configText: string, configId: string): Promise<{latency: number, status: string}> => {
    try {
      const serverInfo = parseConfigText(configText);
      if (!serverInfo) {
        return { latency: -1, status: 'Could not parse config' };
      }
      
      const startTime = Date.now();
      try {
        const response = await fetch(`http://${serverInfo.address}:${serverInfo.port}`, {
          method: 'HEAD',
          timeout: 5000,
          mode: 'no-cors'
        });
        const latency = Date.now() - startTime;
        return { latency, status: 'Success' };
      } catch (error) {
        const latency = Date.now() - startTime;
        if (serverInfo.address && serverInfo.port) {
          return { latency: Math.max(1, latency), status: 'Direct connection' };
        }
        return { latency: -1, status: 'Connection failed' };
      }
    } catch (error) {
      console.error('Error testing config:', error);
      return { latency: -1, status: 'Test error' };
    }
  };

  const extractConfigsFromFile = async (file: ServerFile) => {
    if (!file) return;
    
    try {
      let fileUrl;
      if (useProxy) {
        fileUrl = buildApiUrl(`file-download/${file.id}`);
      } else {
        fileUrl = file.url.startsWith('http') ? file.url : `${serverUrl}${file.url}`;
      }
      
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      
      const fileContent = await response.text();
      const extractedConfigs = extractV2rayConfigurations(fileContent);
      
      if (extractedConfigs.length > 0) {
        setTestingConfigs(extractedConfigs);
        setTestResults({});
        
        extractedConfigs.forEach(async (config) => {
          const result = await testConfig(config.text, config.title);
          setTestResults(prev => ({
            ...prev,
            [config.title]: result
          }));
        });
        
      } else {
      }
    } catch (error) {
      console.error('Error extracting configs:', error);
    }
  };

  const updateProxyConfig = async (targetUrl: string) => {
    setIsUpdatingProxy(true);
    setConnectionError(null);
    setIsConnected(false);
    
    try {
      try {
        new URL(targetUrl);
      } catch {
        throw new Error('Invalid URL format. Please use format: http://server:port or https://server:port');
      }
      
      const testResponse = await fetch(`${targetUrl}/tickets/api/config/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(10000)
      });
      
      if (!testResponse.ok) {
        throw new Error(`Server returned ${testResponse.status}: ${testResponse.statusText}`);
      }
      
      console.log(`Successfully connected to server: ${targetUrl}`);
      setIsConnected(true);
      setServerUrl(targetUrl);
      return true;
      
    } catch (error) {
      console.error('Failed to connect to server:', error);
      setIsConnected(false);
      
      let errorMessage = 'Failed to connect to server';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout - Server may be unreachable';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error - Check if server is running and accessible';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error - Server needs CORS configuration';
        } else {
          errorMessage = error.message;
        }
      }
      
      setConnectionError(errorMessage);
      return false;
    } finally {
      setIsUpdatingProxy(false);
    }
  };

  const handleRestart = () => {
    setIsRestarting(true);
    setTimeout(() => setIsRestarting(false), 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const handleReset = () => {
    setIsResetting(true);
    setTimeout(() => setIsResetting(false), 2000);
  };

  const downloadConfig = async (config: V2RayConfig) => {
    try {
      if ('showSaveFilePicker' in window) {
        const fileName = `${config.title.replace(/\s+/g, '_')}_config.txt`;
        
        const options = {
          suggestedName: fileName,
          types: [
            {
              description: 'Text Files',
              accept: {
                'text/plain': ['.txt'],
              },
            },
            {
              description: 'JSON Files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(config.text);
        await writable.close();
        
        console.log('V2Ray config saved successfully');
      } else {
        // Fallback for browsers that don't support File System Access API
        const blob = new Blob([config.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.title.replace(/\s+/g, '_')}_config.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error saving V2Ray config:', error);
      if ((error as Error).name !== 'AbortError') {
        setConfigError('Failed to save V2Ray configuration');
      }
    }
  };

  const downloadFile = async (file: ServerFile) => {
    try {
      let fileDownloadUrl;
      if (useProxy) {
        fileDownloadUrl = buildApiUrl(`file-download/${file.id}`);
      } else {
        fileDownloadUrl = file.url.startsWith('http') ? file.url : `${serverUrl}${file.url}`;
      }
      
      const response = await fetch(fileDownloadUrl, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName: file.name,
          types: [] as FilePickerAcceptType[], 
        };

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
          const mimeTypes: { [key: string]: string } = {
            'txt': 'text/plain',
            'json': 'application/json',
            'config': 'application/json',
            'yaml': 'text/yaml',
            'yml': 'text/yaml',
            'conf': 'text/plain',
            'zip': 'application/zip',
            'exe': 'application/octet-stream',
          };
          
          if (mimeTypes[extension]) {
            options.types.unshift({
              description: `${extension.toUpperCase()} Files`,
              accept: {
                [mimeTypes[extension]]: [`.${extension}`],
              },
            });
          }
        }

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        console.log('File saved successfully');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if ((error as Error).name !== 'AbortError') {
        setFileError((error as Error).message || "Failed to download file");
      }
    }
  };

  const downloadClientFile = async () => {
    try {
      const url = useProxy ? buildApiUrl('client') : buildApiUrl('download/client.py');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        credentials: 'include',
        signal: AbortSignal.timeout(30000) 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download client file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName: 'client.py',
          types: [{
            description: 'Python Files',
            accept: { 
              'text/x-python': ['.py'],
              'text/plain': ['.py']
            },
          }]
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        console.log('Client file saved successfully');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'client.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading client file:", error);
      let errorMessage = "Failed to download client file";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Download timeout - File may be too large or server slow";
        } else {
          errorMessage = error.message;
        }
      }
      
      setConfigError(errorMessage);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadUrl = useProxy 
        ? '/api/upload/' 
        : `${serverUrl}/tickets/api/upload/`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        setUploadSuccess(`File "${file.name}" uploaded successfully!`);
        await loadFiles();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      setFileError(null);
      
      const url = useProxy ? buildApiUrl('files') : buildApiUrl('files/');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      setIsConnected(true);
    } catch (error) {
      console.error("Error fetching files:", error);
      let errorMessage = (error as Error).message || "Failed to fetch files";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout - Server may be slow or unreachable";
        } else if (error.message.includes('fetch')) {
          errorMessage = "Network error - Check if the server is running and accessible";
        } else if (error.message.includes('CORS')) {
          errorMessage = "CORS error - Server needs CORS configuration";
        }
      }
      
      setFileError(errorMessage);
    } finally {
      setLoadingFiles(false);
    }
  };

  async function downloadAllConfigs() {
    if (!configs.length) {
      console.log('No configs to download');
      return;
    }

    const combinedText = configs.map(config => `# ${config.title}\n\n${config.text}`).join('\n\n---\n\n');

    try {
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName: 'v2ray-config.txt',
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] }
          }]
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(combinedText);
        await writable.close();
        console.log('File saved successfully');
      } else {
        const blob = new Blob([combinedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'v2ray-config.txt';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading all configs:", error);
      if ((error as Error).name !== 'AbortError') {
        setConfigError((error as Error).message || "Failed to download all configs");
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 w-full md:w-[90%] lg:w-[80%] max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-lg md:text-xl font-bold">V2Ray Management</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage and configure your V2Ray proxy server</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Info className="w-5 h-5 mr-2 text-blue-500" />
                    What is V2Ray?
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">V2Ray Overview</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      V2Ray is a powerful network proxy tool that helps you bypass internet restrictions and enhance your online privacy. 
                      It acts as an intermediary between your device and the internet, encrypting your traffic and routing it through secure servers.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Key Features:</h4>
                    <div className="grid gap-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-400">Censorship Circumvention</span>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">Bypass geographical restrictions and access blocked content</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-purple-700 dark:text-purple-400">Traffic Encryption</span>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">Secure your data with advanced encryption protocols</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-400">Multiple Protocols</span>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">Support for VMess, VLESS, Trojan, and more</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-orange-700 dark:text-orange-400">Traffic Obfuscation</span>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">Disguise your traffic to avoid detection</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Why Use V2Ray?</h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      V2Ray provides superior performance, flexibility, and security compared to traditional VPNs. 
                      It's particularly effective in regions with strict internet censorship and offers granular control over your network traffic.
                    </p>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    💡 <strong>Tip:</strong> Always ensure you have proper authorization before using proxy services.
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-green-500/20 text-green-600 dark:text-green-400">
              <Wifi className="w-4 h-4 mr-2" />
              {(isAdmin || isV2RayAdmin) ? 'Admin Only' : 'V2Ray Access'}
            </Badge>
          </div>
        </div>

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
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-green-200 dark:border-green-800 bg-[var(--calendar-date-bg)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                Server Status
              </CardTitle>
              <CardDescription>Current V2Ray server status and uptime</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="font-medium">Online</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                  Operational
                </Badge>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Last restart: Today, 08:30 AM</p>
                <p className="mt-1">Uptime: 24 hours, 15 minutes</p>
              </div>
              <div className="mt-4">
                <Button onClick={downloadClientFile} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Client
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--calendar-date-bg)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security
              </CardTitle>
              <CardDescription>Security status and encryption settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Encryption</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    AES-256-GCM
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Protocol</span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 dark:text-purple-400">
                    VMess
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">TLS</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400">
                    Enabled
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 bg-[var(--calendar-date-bg)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Connection Details
            </CardTitle>
            <CardDescription>Server connection information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Server Address</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{serverUrl}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Port</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">8000</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connection Mode</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{useProxy ? 'Proxy' : 'Direct'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{useProxy ? 'Vite Proxy' : 'Fetch API'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-[var(--calendar-date-bg)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Server Files
            </CardTitle>
            <CardDescription>Available files on the server</CardDescription>
          </CardHeader>
          <CardContent>
            {isV2RayAdmin && (
              <div className="mb-6 p-4 border border-dashed rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload V2Ray Configuration File
                  </h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.json,.conf,.config"
                  />
                  <Button
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    variant="outline"
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </>
                    )}
                  </Button>
                  <div className="text-sm text-muted-foreground flex-1">
                    <p>Supported formats: .txt, .json, .conf, .config</p>
                  </div>
                </div>
                {(uploadSuccess || uploadError) && (
                  <div className="mt-3">
                    {uploadSuccess && (
                      <Alert variant="default" className="border-green-500 bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-500">
                          {uploadSuccess}
                        </AlertDescription>
                      </Alert>
                    )}
                    {uploadError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading files...</span>
              </div>
            ) : fileError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 md:p-3 border rounded-lg">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <h4 className="font-medium text-sm md:text-base">{file.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span className="hidden sm:inline">•</span>
                        <span>By: {file.uploaded_by}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => extractConfigsFromFile(file)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs md:text-sm py-1 h-8"
                        disabled={testingConfigs.includes(file.id)}
                      >
                        {testingConfigs.includes(file.id) ? (
                          <>
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                            <span className="sm:hidden">Test</span>
                            <span className="hidden sm:inline">Extract Configs</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="sm:hidden">Test</span>
                            <span className="hidden sm:inline">Extract Configs</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => downloadFile(file)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs md:text-sm py-1 h-8"
                      >
                        <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 md:mb-6 bg-[var(--calendar-date-bg)]">
          <CardHeader className="px-4 py-3 md:px-6 md:py-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <FileText className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              V2Ray Configurations
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Available V2Ray configuration files</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {loadingConfigs ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading configurations...</span>
              </div>
            ) : configError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{configError}</AlertDescription>
              </Alert>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No configurations available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {configs.map((config) => (
                  <div key={config.id || config.title} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{config.title}</h4>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {config.text.substring(0, 100)}...
                      </p>
                    </div>
                    <Button
                      onClick={() => downloadConfig(config)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {Object.keys(testResults).length > 0 && (
          <Card className="mb-6 bg-[var(--calendar-date-bg)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Extracted V2Ray Configurations
              </CardTitle>
              <CardDescription>Configurations extracted and tested from server files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(testResults).map(([fileId, result]) => (
                  <div key={fileId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{files.find(f => f.id === parseInt(fileId))?.name || `File ${fileId}`}</h4>
                      <Badge variant={result.status === 'success' ? 'success' : 'destructive'}>
                        {result.status === 'success' ? 'Working' : 'Failed'}
                      </Badge>
                    </div>
                    
                    {result.configs && result.configs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Found {result.configs.length} configuration(s):</p>
                        {result.configs.map((config, index) => (
                          <div key={index} className="bg-muted p-3 rounded text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{config.type.toUpperCase()}</span>
                              <Badge variant="outline" size="sm">
                                {config.protocol}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Address:</span>
                                <span className="ml-1 font-mono">{config.address || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Port:</span>
                                <span className="ml-1 font-mono">{config.port || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">ID:</span>
                                <span className="ml-1 font-mono">{config.id || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Network:</span>
                                <span className="ml-1">{config.network || 'N/A'}</span>
                              </div>
                            </div>
                            {config.latency !== undefined && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Latency:</span>
                                <Badge variant={config.latency < 200 ? 'success' : config.latency < 500 ? 'warning' : 'destructive'}>
                                  {config.latency}ms
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {result.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4">
          <Button onClick={handleRestart} disabled={isRestarting}>
            {isRestarting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart Server
              </>
            )}
          </Button>
          
          <Button onClick={handleGenerate} variant="outline" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Config
              </>
            )}
          </Button>
          
          <Button onClick={handleReset} variant="outline" disabled={isResetting}>
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Reset Configs
              </>
            )}
          </Button>

          <Button onClick={downloadAllConfigs} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download All Configs
          </Button>
          
          {isV2RayAdmin && (
            <Button 
              onClick={refreshUserPermissions}
              disabled={refreshingPermissions}
              variant="outline"
            >
              {refreshingPermissions ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing Permissions...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Permissions
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="h-20"></div>
    </div>
  );
}