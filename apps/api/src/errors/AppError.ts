export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly safeDetails?: Record<string, unknown>;

  constructor(input: {
    message: string;
    code: string;
    statusCode: number;
    safeDetails?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = 'AppError';
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.safeDetails = input.safeDetails;
  }
}
