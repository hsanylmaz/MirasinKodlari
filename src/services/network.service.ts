import os from 'os';
import { NetworkInterfaceInfo, NetworkInfoResponse } from '../types/studio.types';

const VIRTUAL_ADAPTER_PATTERNS = [
  /vethernet/i,
  /wsl/i,
  /virtualbox/i,
  /vmware/i,
  /docker/i,
  /hyper-v/i,
  /loopback/i,
  /bluetooth/i,
];

const PREFERRED_ADAPTER_PATTERNS = [
  /wi-?fi/i,
  /wireless/i,
  /wlan/i,
  /ethernet/i,
  /yerel/i,
];

export function getNetworkInfo(
  port: number,
  backgroundsDir: string,
  capturesDir: string
): NetworkInfoResponse {
  const nets = os.networkInterfaces();
  const interfaces: NetworkInterfaceInfo[] = [];

  for (const [name, netList] of Object.entries(nets)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        const isVirtual = VIRTUAL_ADAPTER_PATTERNS.some((rx) => rx.test(name));
        const matchesPreferred = PREFERRED_ADAPTER_PATTERNS.some((rx) => rx.test(name));
        const isPrivateLan =
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address);

        interfaces.push({
          name,
          address: net.address,
          url: `http://${net.address}:${port}`,
          isPreferred: !isVirtual && (matchesPreferred || isPrivateLan),
        });
      }
    }
  }

  interfaces.sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred));

  const recommendedBaseUrl =
    interfaces.length > 0 ? interfaces[0].url : `http://localhost:${port}`;

  return {
    port,
    recommendedBaseUrl,
    interfaces,
    backgroundsDir,
    capturesDir,
  };
}
