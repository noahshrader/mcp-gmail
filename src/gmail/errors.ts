type GmailErrorCode =
  | 'gmail/auth_required'
  | 'gmail/token_expired'
  | 'gmail/rate_limited'
  | 'gmail/not_found'
  | 'gmail/server_error'
  | 'gmail/invalid_input'
  | 'gmail/config_error';

interface GmailErrorOptions {
  cause?: unknown;
  status?: number;
}

export abstract class GmailError extends Error {
  abstract readonly code: GmailErrorCode;

  constructor(
    message: string,
    readonly status?: number,
    options?: GmailErrorOptions
  ) {
    super(message, options);
    this.name = new.target.name;
    this.status = options?.status ?? status;
  }
}

export class GmailAuthError extends GmailError {
  readonly code = 'gmail/auth_required' as const;
}

export class GmailTokenExpiredError extends GmailError {
  readonly code = 'gmail/token_expired' as const;
}

export class GmailRateLimitError extends GmailError {
  readonly code = 'gmail/rate_limited' as const;
}

export class GmailNotFoundError extends GmailError {
  readonly code = 'gmail/not_found' as const;
}

export class GmailServerError extends GmailError {
  readonly code = 'gmail/server_error' as const;
}

export class GmailInvalidInputError extends GmailError {
  readonly code = 'gmail/invalid_input' as const;
}

export class GmailConfigError extends GmailError {
  readonly code = 'gmail/config_error' as const;
}

type ErrorWithStatus = Error & {
  code?: number | string;
  errors?: Array<{ reason?: string }>;
  response?: { status?: number; data?: { error?: { message?: string } } };
  status?: number;
};

function getErrorStatus(error: ErrorWithStatus): number | undefined {
  if (typeof error.status === 'number') {
    return error.status;
  }

  if (typeof error.response?.status === 'number') {
    return error.response.status;
  }

  if (typeof error.code === 'number') {
    return error.code;
  }

  return undefined;
}

function getErrorReason(error: ErrorWithStatus): string | undefined {
  return error.errors?.[0]?.reason;
}

function getErrorMessage(error: ErrorWithStatus): string {
  return error.response?.data?.error?.message ?? error.message;
}

export function normalizeGmailError(error: unknown): GmailError {
  if (error instanceof GmailError) {
    return error;
  }

  if (error instanceof Error) {
    const typedError = error as ErrorWithStatus;
    const status = getErrorStatus(typedError);
    const message = getErrorMessage(typedError);
    const reason = getErrorReason(typedError);

    if (status === 401 || status === 403) {
      return new GmailAuthError(
        'Gmail authorization is missing or expired. Re-run auth login to refresh access.',
        status,
        { cause: error }
      );
    }

    if (status === 404) {
      return new GmailNotFoundError(message, status, { cause: error });
    }

    if (status === 429 || reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
      return new GmailRateLimitError(
        'Gmail API rate limit exceeded. Retry after a short delay.',
        status ?? 429,
        { cause: error }
      );
    }

    if (typeof status === 'number' && status >= 500) {
      return new GmailServerError(
        'Gmail returned a transient server error. Retry the request.',
        status,
        { cause: error }
      );
    }

    return new GmailServerError(message, status, { cause: error });
  }

  return new GmailServerError(String(error));
}