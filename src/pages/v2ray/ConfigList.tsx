import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText,
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface V2RayConfig {
  id?: number;
  title: string;
  text: string;
}

interface ConfigListProps {
  configs: V2RayConfig[];
  loadingConfigs: boolean;
  configError: string | null;
  downloadConfig: (config: V2RayConfig) => void;
}

export default function ConfigList({
  configs,
  loadingConfigs,
  configError,
  downloadConfig
}: ConfigListProps) {
  return (
    <Card className="mb-6 shadow-md rounded-lg overflow-hidden bg-[var(--calendar-date-bg)]">
      <CardHeader className="px-6 py-4 bg-muted/50">
        <CardTitle className="flex items-center text-lg">
          <FileText className="w-5 h-5 mr-2" />
          V2Ray Configurations
        </CardTitle>
        <CardDescription>Available V2Ray configuration files</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
        {loadingConfigs ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading configurations...</span>
          </div>
        ) : configError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        ) : configs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No configurations available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.id || config.title} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-base">{config.title}</h4>
                  <p className="text-sm text-muted-foreground truncate max-w-md mt-1">
                    {config.text.substring(0, 100)}...
                  </p>
                </div>
                <Button
                  onClick={() => downloadConfig(config)}
                  variant="outline"
                  size="sm"
                  className="ml-4"
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
  );
}