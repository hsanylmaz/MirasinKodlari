export interface BackgroundItem {
  id: string;
  fileName: string;
  title: string;
  url: string;
  updatedAt: string;
}

export interface CapturedPhoto {
  id: string;
  fileName: string;
  participantName: string;
  teamName: string;
  backgroundTitle: string;
  createdAt: string;
  imageUrl: string;
  downloadUrl: string;
  mobilePageUrl: string;
}

export interface SavePhotoRequest {
  imageDataUrl: string;
  participantName?: string;
  teamName?: string;
  backgroundTitle?: string;
  customBaseUrl?: string;
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  url: string;
  isPreferred: boolean;
}

export interface NetworkInfoResponse {
  port: number;
  recommendedBaseUrl: string;
  interfaces: NetworkInterfaceInfo[];
  backgroundsDir: string;
  capturesDir: string;
}

export interface WifiQrRequest {
  ssid: string;
  password?: string;
  encryption?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

