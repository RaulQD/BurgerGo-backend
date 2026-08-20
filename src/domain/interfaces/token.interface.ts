export interface ITokenService {
  generateAccessToken(userId: string, email: string): string;
  verifyAccessToken(token: string): { userId: string; email: string };
  generateVerificationSessionToken(
    userId: string,
    email: string,
    type: string,
  ): string;
  verifyVerificationSessionToken(token: string): {
    userId: string;
    email: string;
    type: string;
  };
  generateRefreshToken(userId: string, email: string): string;
  verifyRefreshToken(token: string): { userId: string; email: string };
}
