export function generateStateInvalid(): any {
  return {
    responseStatus: 400,
    responseError: {
      errorCode: "STATE_INVALID",
      errorText: "State is not valid",
    },
  };
}

export function generateAuthError(): any {
  return {
    responseStatus: 401,
    responseError: {
      errorCode: "AUTHENTICATION_FAILED",
      errorText: "Request to the API could not be authenticated",
    },
  };
}

export function generate400Error(result: {
  code: string;
  message: string;
  trace: any;
}) {
  return {
    responseStatus: 400,
    responseError: {
      errorCode: result.code,
      errorText: result.message,
      errorTrace: result.trace,
    },
  };
}
