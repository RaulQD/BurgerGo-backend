import { AppErrorCode } from '../constants/app-error-code';
import { HttpStatusCode } from '../constants/http';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: HttpStatusCode,
    public errorCode?: AppErrorCode,
  ) {
    super(message);
  }
}
