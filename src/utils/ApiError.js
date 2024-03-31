class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something Went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.status = statusCode;
    this.success = false;
    this.data = null;
    this.errors = errors;
    if (stack) this.stack = stack;
    else Error.captureStackTrace(this, this.constructor);
  }
}
export { ApiError };
