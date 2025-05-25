import { Response } from 'express';
export class HttpResponse {
  OK(res: Response, message?: string, data?: any) {
    return res.status(200).json({
      status: 200,
      message: message,
      data
    });
  }
  NOT_FOUND(res: Response, message: string) {
    return res.status(404).json({
      status: 404,
      message: message
    });
  }
  CREATED(res: Response, message: string, data: any) {
    return res.status(201).json({
      status: 201,
      message: message,
      data
    });
  }
  BAD_REQUEST(res: Response, message: string) {
    return res.status(400).json({
      status: 400,
      message: message
    });
  }
  UNAUTHORIZED(res: Response, message: string) {
    return res.status(401).json({
      status: 401,
      message: message
    });
  }
  FORBIDDEN(res: Response, message: string) {
    return res.status(403).json({
      status: 403,
      message: message
    });
  }
  INTERNAL_SERVER_ERROR(res: Response, message: string) {
    return res.status(500).json({
      status: 500,
      message: message
    });
  }

}