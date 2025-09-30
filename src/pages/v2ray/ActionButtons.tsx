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
    <div className="flex flex-wrap gap-3 mb-8">
      <Button onClick={handleRestart} disabled={isRestarting} className="px-4 py-2">
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
      
      <Button onClick={handleGenerate} variant="outline" disabled={isGenerating} className="px-4 py-2">
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
      
      <Button onClick={handleReset} variant="outline" disabled={isResetting} className="px-4 py-2">
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

      <Button onClick={downloadAllConfigs} variant="outline" className="px-4 py-2">
        <Download className="w-4 h-4 mr-2" />
        Download All Configs
      </Button>
      
      {isV2RayAdmin && (
        <Button 
          onClick={refreshUserPermissions}
          disabled={refreshingPermissions}
          variant="outline"
          className="px-4 py-2"
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