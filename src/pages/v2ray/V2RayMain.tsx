import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import V2RayHeader from "./V2RayHeader";
import ServerConfig from "./ServerConfig";
import ServerStatus from "./ServerStatus";
import FileList from "./FileList";
import ConfigList from "./ConfigList";
import ExtractedConfigs from "./ExtractedConfigs";
import ActionButtons from "./ActionButtons";

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

interface User {
  id: number;
  is_v2ray_admin: boolean;
  has_v2ray_access: boolean;
  is_admin: boolean;
  // Add other user properties as needed
}

export default function V2RayMain() {
  const { isAdmin, user, isV2RayAdmin, login } = useAuth();
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
  const [serverUrl, setServerUrl] = useState<string>("http://localhost:8000");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [testingConfigs, setTestingConfigs] = useState<number[]>([]);
  // const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const permissionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      // Handle resize if needed
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const buildApiUrl = useCallback(
    (endpoint: string) => {
      if (useProxy) {
        if (endpoint === "config") return "/api/config/";
        if (endpoint === "files") return "/api/files/";
        if (endpoint === "client") return "/download/client.py";
        if (endpoint.startsWith("file-download")) {
          const fileId = endpoint.split("/")[1];
          return `/download/${fileId}/`;
        }
        if (endpoint === "users") return "/api/users/";
        return endpoint;
      } else {
        return `${serverUrl}/tickets/api/${endpoint}`;
      }
    },
    [serverUrl, useProxy]
  );

  const refreshUserPermissions = useCallback(async () => {
    if (!user) return;
    setRefreshingPermissions(true);
    try {
      const url = buildApiUrl("users");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch user data: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      const currentUser = data.users.find(
        (u: User) => u.id === parseInt(user.id.toString())
      );
      if (currentUser) {
        const updatedUser = {
          ...user,
          is_v2ray_admin: currentUser.is_v2ray_admin,
          has_v2ray_access: currentUser.has_v2ray_access,
          is_admin: currentUser.is_admin
        };
        const token = localStorage.getItem("authToken") || "";
        login(updatedUser, token);
        console.log("User permissions refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing user permissions:", error);
    } finally {
      setRefreshingPermissions(false);
    }
  }, [user, buildApiUrl, login]);

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
  }, [user, refreshUserPermissions]);

  useEffect(() => {
    let isMounted = true;
    const fetchConfigs = async () => {
      setLoadingConfigs(true);
      setConfigError(null);
      try {
        const url = useProxy ? buildApiUrl("config") : buildApiUrl("config/");
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
          throw new Error(
            `Failed to fetch configs: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        if (isMounted) {
          setConfigs(data.configs || []);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error fetching V2Ray configs:", error);
        if (isMounted) {
          let errorMessage =
            (error as Error).message || "Failed to fetch V2Ray configurations";
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              errorMessage =
                "Request timeout - Server may be slow or unreachable";
            } else if (error.message.includes("fetch")) {
              errorMessage =
                "Network error - Check if the server is running and accessible";
            } else if (error.message.includes("CORS")) {
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
        const url = useProxy ? buildApiUrl("files") : buildApiUrl("files/");
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
          throw new Error(
            `Failed to fetch files: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        if (isMounted) {
          setFiles(data.files || []);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
        if (isMounted) {
          let errorMessage =
            (error as Error).message || "Failed to fetch files";
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              errorMessage =
                "Request timeout - Server may be slow or unreachable";
            } else if (error.message.includes("fetch")) {
              errorMessage =
                "Network error - Check if the server is running and accessible";
            } else if (error.message.includes("CORS")) {
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
  }, [navigate, serverUrl, useProxy, buildApiUrl]);

  const extractConfigsFromFile = async (file: ServerFile) => {
    if (!file) return;
    try {
      let fileUrl;
      if (useProxy) {
        fileUrl = buildApiUrl(`file-download/${file.id}`);
      } else {
        fileUrl = file.url.startsWith("http")
          ? file.url
          : `${serverUrl}${file.url}`;
      }
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      // const fileContent = await response.text(); // Not used
      // For now, just add the file to testingConfigs
      setTestingConfigs((prev) => [...prev, file.id]);
    } catch (error) {
      console.error("Error extracting configs:", error);
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
        throw new Error(
          "Invalid URL format. Please use format: http://server:port or https://server:port"
        );
      }

      const testResponse = await fetch(`${targetUrl}/tickets/api/config/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        signal: AbortSignal.timeout(10000)
      });

      if (!testResponse.ok) {
        throw new Error(
          `Server returned ${testResponse.status}: ${testResponse.statusText}`
        );
      }

      console.log(`Successfully connected to server: ${targetUrl}`);
      setIsConnected(true);
      setServerUrl(targetUrl);
      return true;
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setIsConnected(false);

      let errorMessage = "Failed to connect to server";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Connection timeout - Server may be unreachable";
        } else if (error.message.includes("fetch")) {
          errorMessage =
            "Network error - Check if server is running and accessible";
        } else if (error.message.includes("CORS")) {
          errorMessage = "CORS error - Server needs CORS configuration";
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
      if ("showSaveFilePicker" in window) {
        const fileName = `${config.title.replace(/\s+/g, "_")}_config.txt`;

        const options = {
          suggestedName: fileName,
          types: [
            {
              description: "Text Files",
              accept: {
                "text/plain": [".txt"]
              }
            },
            {
              description: "JSON Files",
              accept: {
                "application/json": [".json"]
              }
            }
          ]
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(config.text);
        await writable.close();

        console.log("V2Ray config saved successfully");
      } else {
        // Fallback for browsers that don't support File System Access API
        const blob = new Blob([config.text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${config.title.replace(/\s+/g, "_")}_config.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error saving V2Ray config:", error);
      if ((error as Error).name !== "AbortError") {
        setConfigError("Failed to save V2Ray configuration");
      }
    }
  };

  const downloadFile = async (file: ServerFile) => {
    try {
      let fileDownloadUrl;
      if (useProxy) {
        fileDownloadUrl = buildApiUrl(`file-download/${file.id}`);
      } else {
        fileDownloadUrl = file.url.startsWith("http")
          ? file.url
          : `${serverUrl}${file.url}`;
      }

      const response = await fetch(fileDownloadUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/octet-stream"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();

      if ("showSaveFilePicker" in window) {
        const options = {
          suggestedName: file.name,
          types: [] as FilePickerAcceptType[]
        };

        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension) {
          const mimeTypes: { [key: string]: string } = {
            txt: "text/plain",
            json: "application/json",
            config: "application/json",
            yaml: "text/yaml",
            yml: "text/yaml",
            conf: "text/plain",
            zip: "application/zip",
            exe: "application/octet-stream"
          };

          if (mimeTypes[extension]) {
            options.types.unshift({
              description: `${extension.toUpperCase()} Files`,
              accept: {
                [mimeTypes[extension]]: [`.${extension}`]
              }
            });
          }
        }

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log("File saved successfully");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if ((error as Error).name !== "AbortError") {
        setFileError((error as Error).message || "Failed to download file");
      }
    }
  };

  const downloadClientFile = async () => {
    try {
      const url = useProxy
        ? buildApiUrl("client")
        : buildApiUrl("download/client.py");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        credentials: "include",
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download client file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();

      if ("showSaveFilePicker" in window) {
        const options = {
          suggestedName: "client.py",
          types: [
            {
              description: "Python Files",
              accept: {
                "text/x-python": [".py"],
                "text/plain": [".py"]
              }
            }
          ]
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log("Client file saved successfully");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "client.py";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading client file:", error);
      let errorMessage = "Failed to download client file";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage =
            "Download timeout - File may be too large or server slow";
        } else {
          errorMessage = error.message;
        }
      }

      setConfigError(errorMessage);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadUrl = useProxy
        ? "/api/upload/"
        : `${serverUrl}/tickets/api/upload/`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (response.ok) {
        setUploadSuccess(`File "${file.name}" uploaded successfully!`);
        await loadFiles();
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Upload failed with status: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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

      const url = useProxy ? buildApiUrl("files") : buildApiUrl("files/");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch files: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setFiles(data.files || []);
      setIsConnected(true);
    } catch (error) {
      console.error("Error fetching files:", error);
      let errorMessage = (error as Error).message || "Failed to fetch files";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timeout - Server may be slow or unreachable";
        } else if (error.message.includes("fetch")) {
          errorMessage =
            "Network error - Check if the server is running and accessible";
        } else if (error.message.includes("CORS")) {
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
      console.log("No configs to download");
      return;
    }

    const combinedText = configs
      .map((config) => `# ${config.title}\n\n${config.text}`)
      .join("\n\n---\n\n");

    try {
      if ("showSaveFilePicker" in window) {
        const options = {
          suggestedName: "v2ray-config.txt",
          types: [
            {
              description: "Text Files",
              accept: { "text/plain": [".txt"] }
            }
          ]
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(combinedText);
        await writable.close();
        console.log("File saved successfully");
      } else {
        const blob = new Blob([combinedText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "v2ray-config.txt";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading all configs:", error);
      if ((error as Error).name !== "AbortError") {
        setConfigError(
          (error as Error).message || "Failed to download all configs"
        );
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 w-full md:w-[90%] lg:w-[80%] max-w-6xl">
        <V2RayHeader isAdmin={isAdmin} isV2RayAdmin={isV2RayAdmin} />

        <ServerConfig
          serverUrl={serverUrl}
          setServerUrl={setServerUrl}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          useProxy={useProxy}
          setUseProxy={setUseProxy}
          connectionError={connectionError}
          buildApiUrl={buildApiUrl}
          updateProxyConfig={updateProxyConfig}
          setLoadingConfigs={setLoadingConfigs}
          setLoadingFiles={setLoadingFiles}
          setConfigError={setConfigError}
          setFileError={setFileError}
          setConfigs={setConfigs}
          setFiles={setFiles as unknown as (files: any[]) => void} // TODO: Fix type to avoid 'any'
          isUpdatingProxy={isUpdatingProxy}
        />

        <ServerStatus
          isConnected={isConnected}
          serverUrl={serverUrl}
          useProxy={useProxy}
          downloadClientFile={downloadClientFile}
        />

        <FileList
          files={files}
          loadingFiles={loadingFiles}
          fileError={fileError}
          isV2RayAdmin={isV2RayAdmin}
          isUploading={isUploading}
          uploadSuccess={uploadSuccess}
          uploadError={uploadError}
          testingConfigs={testingConfigs}
          handleFileUpload={handleFileUpload}
          triggerFileInput={triggerFileInput}
          extractConfigsFromFile={extractConfigsFromFile}
          downloadFile={downloadFile}
        />

        <ConfigList
          configs={configs}
          loadingConfigs={loadingConfigs}
          configError={configError}
          downloadConfig={downloadConfig}
        />

        <ExtractedConfigs files={files} testResults={{}} />

        <ActionButtons
          isRestarting={isRestarting}
          isGenerating={isGenerating}
          isResetting={isResetting}
          refreshingPermissions={refreshingPermissions}
          isV2RayAdmin={isV2RayAdmin}
          handleRestart={handleRestart}
          handleGenerate={handleGenerate}
          handleReset={handleReset}
          downloadAllConfigs={downloadAllConfigs}
          refreshUserPermissions={refreshUserPermissions}
        />
      </div>
      <div className="h-20"></div>
    </div>
  );
}
