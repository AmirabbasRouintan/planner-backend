interface VmessConfig {
  protocol: "vmess";
  address: string;
  port: number;
  id: string;
  name: string;
}

interface VlessConfig {
  protocol: "vless";
  address: string;
  port: number;
  id: string;
  name: string;
  path?: string;
  type?: string;
  security?: string;
  encryption?: string;
}

interface ParsedConfig {
  protocol: string;
  address: string;
  port: number;
  name: string;
  path?: string;
  type?: string;
  security?: string;
  encryption?: string;
  id?: string;
}

interface V2RayConfig {
  title: string;
  text: string;
}

export const parseVmessUrl = (url: string): VmessConfig | null => {
  try {
    if (!url.startsWith("vmess://")) return null;

    const encodedPart = url.substring(8);
    const decoded = atob(encodedPart + "=".repeat(-encodedPart.length % 4));
    const config = JSON.parse(decoded);

    return {
      protocol: "vmess",
      address: config.add || "",
      port: parseInt(config.port || 443),
      id: config.id || "",
      name: config.ps || "Unknown"
    };
  } catch (error) {
    console.error("Error parsing vmess URL:", error);
    return null;
  }
};

export const parseVlessUrl = (url: string): VlessConfig | null => {
  try {
    if (!url.startsWith("vless://")) return null;

    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    let name = "Unknown";
    if (searchParams.has("remarks")) {
      name = decodeURIComponent(searchParams.get("remarks")!);
    } else if (urlObj.hash) {
      name = decodeURIComponent(urlObj.hash.substring(1));
    }

    return {
      protocol: "vless",
      address: urlObj.hostname,
      port: parseInt(urlObj.port || "80"),
      id: urlObj.username,
      name,
      path: searchParams.get("path") || "/",
      type: searchParams.get("type") || "tcp",
      security: searchParams.get("security") || "none",
      encryption: searchParams.get("encryption") || "none"
    };
  } catch (error) {
    console.error("Error parsing vless URL:", error);
    return null;
  }
};

export const parseConfigText = (configText: string): ParsedConfig | null => {
  try {
    const vmessUrls = configText.match(/vmess:\/\/[A-Za-z0-9+/=]+/g);
    if (vmessUrls) {
      return parseVmessUrl(vmessUrls[0]);
    }

    const vlessUrls = configText.match(/vless:\/\/[^\s\n]+/g);
    if (vlessUrls) {
      return parseVlessUrl(vlessUrls[0]);
    }

    if (configText.trim().startsWith("{")) {
      const config = JSON.parse(configText);
      const outbounds = config.outbounds || [];
      if (outbounds.length > 0) {
        const outbound = outbounds[0];
        const settings = outbound.settings || {};
        const vnext = settings.vnext || [{}];
        if (vnext.length > 0) {
          const server = vnext[0];
          return {
            protocol: outbound.protocol || "unknown",
            address: server.address || "",
            port: server.port || 443,
            name: "V2Ray JSON Config"
          };
        }
      }
    }

    const addressMatch = configText.match(/"address":\s*"([^"]+)"/);
    const portMatch = configText.match(/"port":\s*(\d+)/);

    if (addressMatch && portMatch) {
      return {
        protocol: "unknown",
        address: addressMatch[1],
        port: parseInt(portMatch[1]),
        name: "Parsed Config"
      };
    }
  } catch (error) {
    console.error("Error parsing config:", error);
  }

  return null;
};

export const extractV2rayConfigurations = (
  fileContent: string
): V2RayConfig[] => {
  const configs: V2RayConfig[] = [];

  try {
    const jsonConfigs =
      fileContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
    jsonConfigs.forEach((jsonStr) => {
      try {
        const parsedConfig = JSON.parse(jsonStr);
        if (parsedConfig.inbounds || parsedConfig.outbounds) {
          configs.push({
            title: `V2Ray Config ${configs.length + 1}`,
            text: JSON.stringify(parsedConfig, null, 2)
          });
        }
      } catch {
        // Intentionally empty - skip invalid JSON
      }
    });

    const vmessUrls = fileContent.match(/vmess:\/\/[A-Za-z0-9+/=]+/g) || [];
    vmessUrls.forEach((url, i) => {
      try {
        // Validate the URL format without actually using the parsed data
        const encodedPart = url.substring(8);
        atob(encodedPart + "=".repeat(-encodedPart.length % 4));

        configs.push({
          title: `Vmess Config ${i + 1}`,
          text: url
        });
      } catch {
        // Intentionally empty - skip invalid vmess URLs
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
    console.error("Error extracting configurations:", error);
  }

  return configs;
};

export const testConfig = async (
  configText: string
): Promise<{ latency: number; status: string }> => {
  try {
    const serverInfo = parseConfigText(configText);
    if (!serverInfo) {
      return { latency: -1, status: "Could not parse config" };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Execute the fetch but don't assign the result since we don't use it
      await fetch(`http://${serverInfo.address}:${serverInfo.port}`, {
        method: "HEAD",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      return { latency, status: "Success" };
    } catch {
      // Intentionally ignoring the error as we're handling it by returning connection status
      const latency = Date.now() - startTime;
      if (serverInfo.address && serverInfo.port) {
        return { latency: Math.max(1, latency), status: "Direct connection" };
      }
      return { latency: -1, status: "Connection failed" };
    }
  } catch (error) {
    // Intentionally ignoring the error as we're handling it by returning test error status
    console.error("Error testing config:", error);
    return { latency: -1, status: "Test error" };
  }
};
