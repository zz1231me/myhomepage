import api from './axios';

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetupData {
  qrCode: string;
  secret: string;
}

// axios baseURL이 이미 `/api` 이므로 path는 `/2fa/...` 로 시작해야 함 (`/api/2fa/...` 시 `/api/api/2fa/...` 로 잘못된 URL 생성)
export const verifyLogin2FA = (
  tempToken: string,
  token: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ success: boolean; data: { user: any; tokenInfo: any } }> =>
  api.post('/2fa/verify-login', { tempToken, token }).then(res => res.data);
