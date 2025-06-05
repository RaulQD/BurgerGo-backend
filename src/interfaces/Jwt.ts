
export interface JwtPayload {
  id: string;
  email?: string;
  username?: string;
  rol?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token?: string;
}