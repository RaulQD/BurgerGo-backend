import { AppErrorCode } from './app-error-code';
import { HttpStatusCode } from './http-status-code';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: HttpStatusCode,
    public errorCode?: AppErrorCode,
  ) {
    super(message);
  }
}
