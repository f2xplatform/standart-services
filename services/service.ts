import * as testSettings from "./commonTestSettings.json";

export interface IQueueEnv {}
export interface IBindingEnv {}

interface IBaseServiceEnv extends IQueueEnv, IBindingEnv {
  kv_env: KVNamespace;
  q_trace: Queue;
  q_exception: Queue;
  TRACE: "0" | "1" | "2";
  INSTANCE: "stage" | "main";
  LOG: "no" | "error" | "all";
  EXCEPTION: "0" | "1";
}

abstract class TBaseService {
  protected readonly name: string;
  protected readonly q_trace: Queue;
  protected readonly q_exception: Queue;
  protected readonly kv_env: KVNamespace;
  private _id: string = "";
  private _trace: number = 0;
  private _log: "no" | "error" | "all" = "no";
  private _exception: number = 0;
  abstract maskArray: Array<string>;
  readonly INSTANCE: "stage" | "main";

  constructor(env: IBaseServiceEnv, name: string) {
    this.name = name;
    this.kv_env = env.kv_env;
    this.id = this.getRandomID();
    this.trace = env.TRACE ? Number(env.TRACE) : 0;
    this.exception = env.EXCEPTION ? Number(env.EXCEPTION) : 0;
    this.q_trace = env.q_trace;
    this.q_exception = env.q_exception;
    this.INSTANCE = env.INSTANCE;
    this.log = env.LOG;
  }

  get trace(): number {
    return this._trace;
  }
  set trace(trace: string | number) {
    this._trace = Number(trace);
  }

  get id(): string {
    return this._id;
  }
  set id(id: string) {
    this._id = id;
  }

  get log(): "no" | "error" | "all" {
    return this._log;
  }
  set log(log: "no" | "error" | "all") {
    this._log = log;
  }

  get exception(): number {
    return this._exception;
  }
  set exception(exception: string | number) {
    this._exception = Number(exception);
  }

  async getKVParam(kvKey: string) {
    return await this.kv_env.get(this.name + "_" + kvKey);
  }

  async setKVParam(
    kvKey: string,
    kvValue: string,
    expirationInSeconds?: number
  ) {
    if (expirationInSeconds !== undefined && expirationInSeconds >= 0) {
      await this.kv_env.put(this.name + "_" + kvKey, kvValue, {
        expirationTtl: expirationInSeconds,
      });
    } else {
      await this.kv_env.put(this.name + "_" + kvKey, kvValue);
    }
  }

  protected generateHttpInit(
    method: string,
    body?: BodyInit,
    additionalHeaders?: {}
  ) {
    let headers = {
      "Content-Type": "application/json",
      f2x_request_id: this.id,
      f2x_trace: this.trace.toString(),
    };
    if (additionalHeaders) {
      headers = Object.assign(headers, additionalHeaders);
    }

    if (body) {
      return {
        body: body,
        method: method,
        headers: headers,
      };
    } else {
      return {
        method: method,
        headers: headers,
      };
    }
  }

  protected maskInfo(str: string) {
    for (let field of this.maskArray) {
      str = str.replaceAll(field, "MASKED");
    }
    return str;
  }

  protected async getTraceMessageHttpRequest(request: Request) {
    let requestClone = request.clone();
    let requestHeaders = Object.fromEntries(requestClone.headers);
    let requestURL = new URL(requestClone.url);
    let requestMethod = requestClone.method.toLowerCase();
    let requestBody = await requestClone.text();

    let message: {
      requestURL: URL;
      requestMethod: string;
      requestBody: string;
      requestHeaders?: {};
    } = {
      requestURL: requestURL,
      requestMethod: requestMethod,
      requestBody: requestBody,
    };
    if (this.trace === 2) {
      message.requestHeaders = requestHeaders;
    }
    return JSON.stringify(message, null, 2);
  }

  async getExceptionMessage(exception: any, url: string, body: any) {
    let exceptionMessage: {
      url: string;
      body: any;
      code: string;
      message: string;
      stack?: string;
    } = {
      url: url,
      body: body,
      code: exception.code,
      message: exception.message,
    };

    if (this.exception) {
      exceptionMessage.stack = exception.stack;
      let queueMessage = {
        serviceName: this.name,
        time: new Date(Date.now()).toISOString(),
        message: this.maskInfo(JSON.stringify(exceptionMessage, null, 2)),
      };
      await this.q_exception.send(queueMessage);
    }
    if (this.trace) {
      exceptionMessage.stack = exception.stack;
    }
    return this.maskInfo(JSON.stringify(exceptionMessage, null, 2));
  }

  protected async getTraceMessageHttpResponse(response: Response) {
    let responseClone = response.clone();
    let responseUrl = responseClone.url;
    let responseHeaders = Object.fromEntries(responseClone.headers);
    let responseStatus = responseClone.status;
    let responseBody = await responseClone.text();

    let message: {
      url: string;
      responseStatus: number;
      responseBody: string;
      responseHeaders?: {};
    } = {
      url: responseUrl,
      responseStatus: responseStatus,
      responseBody: responseBody,
    };
    if (this.trace === 2) {
      message.responseHeaders = responseHeaders;
    }
    return JSON.stringify(message, null, 2);
  }

  async callService(
    env: IBaseServiceEnv,
    name: keyof IBindingEnv,
    url: string,
    method: string,
    params?: BodyInit
  ): Promise<any> {
    let service = env[name] as Fetcher;
    let response = await service.fetch(
      `https://${name}/${url}`,
      this.generateHttpInit(method, params)
    );
    return await response.json();
  }

  async callHttp(url: string, method: string, params?: BodyInit, headers?: {}) {
    let request = new Request(
      url,
      this.generateHttpInit(method, params, headers)
    );
    if (this.trace) {
      let reqMessage = await this.getTraceMessageHttpRequest(request);
      await this.traceMessage(reqMessage, "http_request");
    }
    let response = await fetch(request);
    if (this.trace) {
      let respMessage = await this.getTraceMessageHttpResponse(response);
      await this.traceMessage(respMessage, "http_response");
    }
    return response;
  }

  async sendQueue(env: IBaseServiceEnv, queue: keyof IQueueEnv, message: any) {
    let result = {
      id: this.id,
      trace: this.trace,
      message: message,
    };
    let queueStorage = env[queue] as Queue;
    await queueStorage.send(result);
  }

  protected async traceMessage(message: string, type: string, error?: {}) {
    let result = {
      serviceName: this.name,
      type: type,
      id: this.id,
      time: new Date(Date.now()).toISOString(),
      error: error,
      message: this.maskInfo(message),
    };
    await this.q_trace.send(result);
  }

  private getRandomID() {
    return crypto.randomUUID();
  }
}

export interface IHttpServiceEnv extends IBaseServiceEnv {
  q_access: Queue;
}

export type TRequestHttpParams = {
  url: string;
  method: string;
  ip: string;
  body: {};
  headers: {};
};

export type TRequestUrlPattern = {
  id: string;
  descr: string;
  pathname: string;
  method: string;
  func: Function;
  test?: {};
};

export abstract class THttpService extends TBaseService {
  protected requestHttpParams = {} as TRequestHttpParams;
  private _requestUrlPatterns: Array<TRequestUrlPattern> =
    {} as Array<TRequestUrlPattern>;
  protected readonly q_access: Queue;

  constructor(env: IHttpServiceEnv, name: string) {
    super(env, name);
    this.q_access = env.q_access;
    this.requestUrlPatterns = [] as Array<TRequestUrlPattern>;
  }

  get requestUrlPatterns(): Array<TRequestUrlPattern> {
    return this._requestUrlPatterns;
  }
  set requestUrlPatterns(patterns: Array<TRequestUrlPattern>) {
    this._requestUrlPatterns = [
      ...patterns,
      ...[
        {
          id: "all_requests_id",
          descr: "Получение описания поддерживаемых запросов",
          pathname: "/std/requests",
          method: "get",
          func: this.getAllRequests,
          test: testSettings["all_requests_id"],
        },
        {
          id: "request_params_id",
          descr: "Получение параметров запроса",
          pathname: "/std/requests/:req_id",
          method: "get",
          func: this.getRequestParams,
          test: testSettings["request_params_id"],
        },
      ],
    ];
  }

  async init(request: Request) {
    const requestClone = request.clone();
    this.requestHttpParams = {
      method: request.method.toLowerCase(),
      url: request.url,
      headers: Object.fromEntries(request.headers),
      body: await requestClone.text(),
      ip: Object.fromEntries(request.headers).ip
        ? Object.fromEntries(request.headers).ip
        : "",
    };

    if (request.headers.get("f2x_request_id")) {
      this.id = request.headers.get("f2x_request_id")!;
    }
    if (
      request.headers.get("f2x_trace") &&
      Number(request.headers.get("f2x_trace")) > this.trace
    ) {
      this.trace = request.headers.get("f2x_trace")!;
    }

    if (this.trace) {
      let message = await this.getTraceMessageHttpRequest(request);
      await this.traceMessage(message, "service_in");
    }
  }

  protected async getAllRequests(env: IHttpServiceEnv) {
    let res = this.requestUrlPatterns.map((item) => {
      return {
        id: item.id,
        name: this.name,
        descr: item.descr,
        url: `https://${this.name}${item.pathname}`,
        method: item.method,
      };
    });
    let result = {
      responseStatus: 200,
      responseError: [],
      responseResult: {
        vars: {
          TRACE: env.TRACE,
          LOG: env.TRACE,
          EXCEPTION: env.EXCEPTION,
        },
        params: res,
      },
    };
    return result;
  }
  
  protected getRequestParams(
    env: IHttpServiceEnv,
    pattern: TRequestUrlPattern,
    requestHttpParams: TRequestHttpParams
  ) {
    let urlPattern = new URLPattern({ pathname: pattern.pathname });
    let req_id = urlPattern.exec(requestHttpParams.url)!.pathname.groups.req_id;
    let request = this.requestUrlPatterns.find((item) => item.id === req_id);
    if (request) {
      let result = {
        responseStatus: 200,
        responseError: [],
        responseResult: {
          name: this.name,
          id: request.id,
          descr: request.descr,
          url: `https://${this.name}${request.pathname}`,
          method: request.method,
          test: request.test
        },
      };

      return result;
    }
  }

  protected async logAccess(
    requestUrl: string,
    requestMethod: string,
    statusCode: number,
    ip: string,
    isError: "1" | "0"
  ) {
    let result = this.maskInfo(
      JSON.stringify({
        serviceName: this.name,
        time: new Date(Date.now()).toISOString(),
        requestUrl: requestUrl,
        requestMethod: requestMethod,
        statusCode: statusCode,
        ip: ip,
        isError: isError,
      })
    );
    await this.q_access.send(JSON.parse(result));
  }

  async handleUrlRequest(env: IHttpServiceEnv) {
    try {
      for (let pattern of this.requestUrlPatterns) {
        let urlPattern = new URLPattern({ pathname: pattern.pathname });
        if (
          !urlPattern.test(this.requestHttpParams.url) ||
          this.requestHttpParams.method !== pattern.method
        )
          continue;

        let result = await pattern.func.call(
          this,
          env,
          pattern,
          this.requestHttpParams
        );
        if (result?.responseError && result?.responseError.length) {
          return await this.generateResponseError(
            result.responseStatus,
            `API_ERROR`,
            `Exception on ${this.requestHttpParams.url}`,
            result,
            result.responseError
          );
        }

        if (result?.responseResult) {
          return await this.generateResponseOK(
            JSON.stringify(result.responseResult, null, 2),
            result.responseStatus
          );
        }
      }

      return await this.generateResponseError(
        404,
        `NOT_FOUND`,
        "Data not found",
        null
      );
    } catch (error: any) {
      let exceptionMessage = await this.getExceptionMessage.call(
        this,
        error,
        this.requestHttpParams.url,
        this.requestHttpParams.body
      );
      return await this.generateResponseError(
        400,
        "VERIFICATION_FAILED",
        "Bad params",
        exceptionMessage
      );
    }
  }

  async generateResponseError(
    statusCode: number,
    errorCode: string,
    errorText: string,
    errorTrace: any,
    data?: any
  ) {
    let error: {
      code: string;
      message: string;
      data?: {
        identityTypes: Array<{ name: string; isEnabled: boolean }>;
        state: string;
      };
      trace: null | string;
    } = {
      code: errorCode,
      message: errorText,
      trace: errorTrace,
    };
    if (data) {
      error.data = data;
    }

    let response = new Response(JSON.stringify(error, null, 2), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (this.trace) {
      let message = await this.getTraceMessageHttpResponse(response);
      await this.traceMessage(message, "service_out", error);
    }
    if (this.log === "error" || this.log === "all") {
      await this.logAccess(
        this.requestHttpParams.url,
        this.requestHttpParams.method,
        response.status,
        this.requestHttpParams.ip,
        "1"
      );
    }

    return response;
  }

  async generateResponseOK(
    resp: string,
    status: number,
    additionalHeaders?: {}
  ) {
    let headers = {
      "Content-Type": "application/json",
    };
    if (additionalHeaders) {
      headers = Object.assign(headers, additionalHeaders);
    }
    let response = new Response(resp, {
      status: status,
      headers: headers,
    });

    if (this.trace) {
      let message = await this.getTraceMessageHttpResponse(response);
      await this.traceMessage(message, "service_out");
    }

    if (this.log === "all") {
      await this.logAccess(
        this.requestHttpParams.url,
        this.requestHttpParams.method,
        response.status,
        this.requestHttpParams.ip,
        "0"
      );
    }

    return response;
  }
}

export interface ICronServiceEnv extends IBaseServiceEnv {}

export abstract class TCronService extends TBaseService {
  constructor(env: ICronServiceEnv, name: string) {
    super(env, name);
  }

  async init() {
    if (this.trace) {
      await this.traceCronStart();
    }
  }

  private async traceCronStart() {
    await this.traceMessage(`${this.name} start`, "cron_start");
  }

  async traceCronStop(error?: string) {
    await this.traceMessage(`${this.name} stop`, "cron_stop", error);
  }
}

export interface IQueuesServiceEnv extends IBaseServiceEnv {}

export abstract class TQueueService extends TBaseService {
  protected env_trace: number = this.trace;
  constructor(env: IQueuesServiceEnv, name: string) {
    super(env, name);
  }
  async init(messageBatch: MessageBatch) {
    if (this.trace) {
      await this.traceQueueStart(messageBatch);
    }
  }
  async handleQMessage(message: { id: string; trace: number; message: any }) {
    this.trace =
      message.trace > this.env_trace ? message.trace : this.env_trace;
    this.id = message.id;
    if (this.trace === 2) {
      await this.traceMessage(
        `queue consumer, message: ${JSON.stringify(message.message)}`,
        "queue_handle"
      );
    }
    return message.message;
  }
  private async traceQueueStart(messageBatch: MessageBatch) {
    await this.traceMessage(
      `${this.name} queue start, messages - ${messageBatch.messages.length}`,
      "queue_start"
    );
  }

  async traceQueueStop(error?: string) {
    await this.traceMessage(`${this.name} queue stop`, "queue_stop", error);
  }
}