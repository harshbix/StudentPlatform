export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);
export const unauthenticated = (message = "Authentication required") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const unauthorized = (message = "Insufficient permissions") =>
  new AppError(403, "UNAUTHORIZED", message);
export const notFound = (message = "Resource not found") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
export const unprocessable = (message: string) => new AppError(422, "VALIDATION_ERROR", message);
