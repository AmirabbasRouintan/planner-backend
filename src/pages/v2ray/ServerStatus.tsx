import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Shield,
  Download
} from "lucide-react";

interface ServerStatusProps {
  isConnected: boolean;
  serverUrl: string;
  useProxy: boolean;
  downloadClientFile: () => void;
}

export default function ServerStatus({
  isConnected,
  serverUrl,
  useProxy,
  downloadClientFile
}: ServerStatusProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={isConnected ? "p-5 border-green-200 dark:border-green-800 bg-[var(--calendar-date-bg)]" : "p-5 border-red-200 dark:border-red-800 bg-[var(--calendar-date-bg)]"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Server className={`w-5 h-5 mr-2 ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              Server Status
            </CardTitle>
            <CardDescription>Current V2Ray server status and uptime</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
              <Badge variant="outline" className={isConnected ? "border-green-500 text-green-600 dark:text-green-400" : "border-red-500 text-red-600 dark:text-red-400"}>
                {isConnected ? 'Operational' : 'Disconnected'}
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

        <Card className="p-5 bg-[var(--calendar-date-bg)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security
            </CardTitle>
            <CardDescription>Security status and encryption settings</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
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

      <Card className="p-5 mt-6 bg-[var(--calendar-date-bg)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Connection Details
          </CardTitle>
          <CardDescription>Server connection information</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
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
    </>
  );
}