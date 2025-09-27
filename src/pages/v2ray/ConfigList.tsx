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
  );
}