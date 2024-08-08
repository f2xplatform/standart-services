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

export function generateApiError(apiResult: any, data?: any) {
  if (
    apiResult.error?.message ===
    "Request validation failed. Check inner errors for more details"
  ) {
    return {
      errorCode: apiResult.error?.innerErrors[0]?.code,
      errorText: apiResult.error?.innerErrors[0]?.message,
      errorTrace: apiResult,
      errorData: data,
    };
  } else {
    return {
      errorCode: apiResult.error?.code,
      errorText: apiResult.error?.message,
      errorTrace: apiResult,
      errorData: data,
    };
  }
}