import { Response } from 'express';
import { HttpException } from '../errors/custom.error';
import { HttpResponse } from '../shared/http-response';

export class BaseController {
  protected readonly httpResponse = new HttpResponse();
  protected handleError(error: unknown, res: Response) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return this.httpResponse.INTERNAL_SERVER_ERROR(
      res,
      'Error interno del servidor',
    );
  }
}
