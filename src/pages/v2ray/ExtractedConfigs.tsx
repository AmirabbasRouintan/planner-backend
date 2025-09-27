import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ServerFile {
  id: number;
  name: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ExtractedConfig {
  type?: string;
  protocol?: string;
  address?: string;
  port?: string | number;
  id?: string;
  network?: string;
  latency?: number;
}

interface TestResult {
  latency: number;
  status: string;
  configs?: ExtractedConfig[];
  error?: string;
}

interface ExtractedConfigsProps {
  testResults: Record<string, TestResult>;
  files: ServerFile[];
}

export default function ExtractedConfigs({
  testResults,
  files
}: ExtractedConfigsProps) {
  return (
    Object.keys(testResults).length > 0 && (
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
                  <Badge variant={result.status === 'Success' ? 'default' : 'destructive'}>
                    {result.status === 'Success' ? 'Working' : 'Failed'}
                  </Badge>
                </div>
                
                {result.configs && result.configs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Found {result.configs.length} configuration(s):</p>
                    {result.configs.map((config, index) => (
                      <div key={index} className="bg-muted p-3 rounded text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{config.type?.toUpperCase() || 'CONFIG'}</span>
                          <Badge variant="outline">
                            {config.protocol || 'unknown'}
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
                            <Badge variant={config.latency !== undefined ? 
                              (config.latency < 200 ? 'default' : 
                               config.latency < 500 ? 'secondary' : 'destructive') : 'default'}>
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
    )
  );
}