
export class HttpException extends Error {
  public status: number;
  public message: string;
  constructor(message: string) {
    super(message);

    this.message = message;
  }

}
export class ConflictException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}
export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}
export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}
export class UnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}
export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}
export class InternalServerErrorException extends HttpException {
  constructor(message: string) {
    super(message);
  }
}