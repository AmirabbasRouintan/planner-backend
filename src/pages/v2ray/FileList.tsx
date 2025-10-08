import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText,
  Download,
  Play,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface ServerFile {
  id: number;
  name: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface FileListProps {
  files: ServerFile[];
  loadingFiles: boolean;
  fileError: string | null;
  isV2RayAdmin: boolean;
  isUploading: boolean;
  uploadSuccess: string | null;
  uploadError: string | null;
  testingConfigs: number[];
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileInput: () => void;
  extractConfigsFromFile: (file: ServerFile) => void;
  downloadFile: (file: ServerFile) => void;
}

export default function FileList({
  files,
  loadingFiles,
  fileError,
  isV2RayAdmin,
  isUploading,
  uploadSuccess,
  uploadError,
  testingConfigs,
  handleFileUpload,
  triggerFileInput,
  extractConfigsFromFile,
  downloadFile
}: FileListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mb-6 shadow-md rounded-lg overflow-hidden bg-[var(--calendar-date-bg)]">
      <CardHeader className="px-6 py-4 bg-muted/50">
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Server Files
        </CardTitle>
        <CardDescription>Available files on the server</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
        {isV2RayAdmin && (
          <div className="mb-6 p-5 border border-dashed rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Upload V2Ray Configuration File
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
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
              <div className="mt-4">
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
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading files...</span>
          </div>
        ) : fileError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 mb-3 sm:mb-0">
                  <h4 className="font-medium text-base">{file.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
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
                    className="flex-1 sm:flex-none text-sm py-2 h-9"
                    disabled={testingConfigs.includes(file.id)}
                  >
                    {testingConfigs.includes(file.id) ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        <span className="sm:hidden">Test</span>
                        <span className="hidden sm:inline">Extract Configs</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        <span className="sm:hidden">Test</span>
                        <span className="hidden sm:inline">Extract Configs</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => downloadFile(file)}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none text-sm py-2 h-9"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}