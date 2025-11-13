import jwt from 'jsonwebtoken';
import { TemporaryTokenPayload } from '../interfaces/TemporaryTokenPayload';

export class TokenSecurityService {
  private TEMPORARY_TOKEN_SECRET: string;
  private readonly TEMPORARY_TOKEN_EXPIRATION = 10;
  constructor() {
    if (!process.env.TEMPORARY_TOKEN_SECRET) {
      throw new Error('Temporary secret no esta configurado');
    }
    this.TEMPORARY_TOKEN_SECRET = process.env.TEMPORARY_TOKEN_SECRET;
  }

  public generate6DigitToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  public generateTemporaryToken(payload: TemporaryTokenPayload): string {
    return jwt.sign(payload, this.TEMPORARY_TOKEN_SECRET, {
      expiresIn: this.TEMPORARY_TOKEN_EXPIRATION,
    });
  }
}
