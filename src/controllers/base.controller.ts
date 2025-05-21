import { HttpException } from "../errors/custom.error";
import { HttpResponse } from "../shared/http-response";

export class BaseController {
  protected readonly httpResponse = new HttpResponse();
  protected handleError(error: any, res: any) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        status: error.status,
        message: error.message,
      });
    }
    console.log(error);
    return this.httpResponse.INTERNAL_SERVER_ERROR(res, "Error interno del servidor");
  }

}