import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, Wifi } from "lucide-react";

export default function V2RayHeader({ isAdmin, isV2RayAdmin }: { 
  isAdmin: boolean; 
  isV2RayAdmin: boolean; 
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">V2Ray Management</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Manage and configure your V2Ray proxy server</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Info className="h-5 w-5" />
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">V2Ray Overview</h4>
                <p className="text-gray-700 dark:text-gray-300">
                  V2Ray is a powerful network proxy tool that helps you bypass internet restrictions and enhance your online privacy. 
                  It acts as an intermediary between your device and the internet, encrypting your traffic and routing it through secure servers.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Key Features:</h4>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-400">Censorship Circumvention</span>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Bypass geographical restrictions and access blocked content</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-purple-700 dark:text-purple-400">Traffic Encryption</span>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Secure your data with advanced encryption protocols</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-400">Multiple Protocols</span>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Support for VMess, VLESS, Trojan, and more</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-orange-700 dark:text-orange-400">Traffic Obfuscation</span>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Disguise your traffic to avoid detection</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
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
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-green-500/20 text-green-600 dark:text-green-400">
          <Wifi className="w-4 h-4 mr-2" />
          {(isAdmin || isV2RayAdmin) ? 'Admin Only' : 'V2Ray Access'}
        </Badge>
      </div>
    </div>
  );
}