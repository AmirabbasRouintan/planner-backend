import { Button } from "@/components/ui/button";
import { 
  RotateCcw,
  Play,
  XCircle,
  Download,
  RefreshCw
} from "lucide-react";

interface ActionButtonsProps {
  isRestarting: boolean;
  isGenerating: boolean;
  isResetting: boolean;
  refreshingPermissions: boolean;
  isV2RayAdmin: boolean;
  handleRestart: () => void;
  handleGenerate: () => void;
  handleReset: () => void;
  downloadAllConfigs: () => void;
  refreshUserPermissions: () => void;
}

export default function ActionButtons({
  isRestarting,
  isGenerating,
  isResetting,
  refreshingPermissions,
  isV2RayAdmin,
  handleRestart,
  handleGenerate,
  handleReset,
  downloadAllConfigs,
  refreshUserPermissions
}: ActionButtonsProps) {
  return (
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
  );
}