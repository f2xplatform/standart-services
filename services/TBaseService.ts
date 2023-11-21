import { bufferToString, decrypt, stringToBuffer, encrypt } from "./utils";

export interface IQueueEnv {}
export interface IBindingEnv {}

export interface IBaseServiceEnv extends IQueueEnv, IBindingEnv {
  kv_env: KVNamespace;
  q_trace: Queue<any>;
  q_exception: Queue<any>;
  TRACE: "0" | "1" | "2";
  INSTANCE: "stage" | "main" | "test" | "dev";
  LOG: "no" | "error" | "all";
  EXCEPTION: "0" | "1";
}

export abstract class TBaseService {
  protected readonly name: string;
  protected readonly q_trace: Queue<any>;
  protected readonly q_exception: Queue<any>;
  protected readonly kv_env: KVNamespace;
  private _id: string = "";
  private _trace: number = 0;
  private _log: "no" | "error" | "all" = "no";
  private _exception: number = 0;
  abstract maskArray: Array<string>;
  readonly INSTANCE: "stage" | "main" | "dev" | "test";
  protected version: string;

  constructor(env: IBaseServiceEnv, name: string, version:string) {
    this.name = name;
    this.kv_env = env.kv_env;
    this.id = this.getRandomID();
    this.trace = env.TRACE ? Number(env.TRACE) : 0;
    this.exception = env.EXCEPTION ? Number(env.EXCEPTION) : 0;
    this.q_trace = env.q_trace;
    this.q_exception = env.q_exception;
    this.INSTANCE = env.INSTANCE;
    this.log = env.LOG;
    this.version = version;
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

  async getKVParam(kvKey: string, cryptoPass?: string) {
    let value: string;
    if (cryptoPass) {
      let result = await this.getKVParamWithMetadata(kvKey, cryptoPass);
      if (result?.value) {
        value = result.value;
      }
    } else {
      value = await this.kv_env.get(this.name + "_" + kvKey);
    }
    return value;
  }

  async getKVParamWithMetadata(kvKey: string, cryptoPass?: string) {
    let result: {
      value: string;
      metadata: { [key: string]: any };
    } = await this.kv_env.getWithMetadata(this.name + "_" + kvKey);
    if (cryptoPass && result.value && result?.metadata?.iv) {
      result.value = bufferToString(
        await decrypt(
          result.value,
          kvKey,
          stringToBuffer(result.metadata.iv),
          cryptoPass
        )
      );
    }
    return result;
  }

  async setKVParam(
    kvKey: string,
    kvValue: string,
    expirationInSeconds?: number,
    metadata?: {},
    cryptoPass?: string
  ) {
    let params: { [key: string]: any } = {};
    if (metadata) {
      params.metadata = metadata;
    }
    if (expirationInSeconds !== undefined && expirationInSeconds >= 60) {
      params.expirationTtl = expirationInSeconds;
    }
    if (cryptoPass) {
      let iv = crypto.getRandomValues(new Uint8Array(12));
      let encryptedValue = await encrypt(kvValue, kvKey, iv, cryptoPass);
      if (params.metadata) {
        params.metadata.iv = bufferToString(iv);
      } else {
        params.metadata = { iv: bufferToString(iv) };
      }
      await this.kv_env.put(
        this.name + "_" + kvKey,
        bufferToString(encryptedValue),
        params
      );
    } else {
      await this.kv_env.put(this.name + "_" + kvKey, kvValue, params);
    }
  }

  async deleteKVParam(kvKey: string) {
    await this.kv_env.delete(this.name + "_" + kvKey);
  }

  async getKVList(prefix?: string, limit?: number, cursor?: string) {
    let params: { prefix?: string; limit?: number; cursor?: string } = {};
    if (prefix) {
      params.prefix = prefix;
    }
    if (limit) {
      params.limit = limit;
    }
    if (cursor) {
      params.cursor = cursor;
    }
    if (Object.keys(params).length) {
      return await this.kv_env.list(params);
    }
    return await this.kv_env.list();
  }

  async setDurableKVParam(
    stub: DurableObject,
    key: string,
    value: string,
    expire: number,
    meta?: { [key: string]: any },
    cryptoPass?: string
  ): Promise<any> {
    let params: {
      key: string;
      value: string;
      expire: number;
      meta?: { [key: string]: any };
    } = {
      key: key,
      value: value,
      meta: meta,
      expire: expire,
    };

    if (cryptoPass) {
      let iv = crypto.getRandomValues(new Uint8Array(12));
      let encryptedValue = await encrypt(value, key, iv, cryptoPass);
      params.value = bufferToString(encryptedValue);
      if (params.meta) {
        params.meta.iv = bufferToString(iv);
      } else {
        params.meta = { iv: bufferToString(iv) };
      }
    }
    let request = new Request(
      "https://v1/kv",
      this.generateHttpInit("POST", JSON.stringify(params))
    );
    let response = await stub.fetch(request);
    return await response.json();
  }

  async getDurableKVParamWithMetadata(
    stub: DurableObject,
    key: string,
    cryptoPass?: string
  ): Promise<any> {
    try {
      let request = new Request("https://v1/kv", this.generateHttpInit("GET"));
      let response = await stub.fetch(request);
      if (response.status === 200) {
        let result: {
          key: string;
          value: string;
          expire?: number;
          meta?: { [key: string]: any };
        } = await response.json();

        if (cryptoPass && result.value && result?.meta?.iv) {
          result.value = bufferToString(
            await decrypt(
              result.value,
              key,
              stringToBuffer(result.meta.iv),
              cryptoPass
            )
          );
        }
        return result;
      } else {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  async getDurableKVParam(
    stub: DurableObject,
    key: string,
    cryptoPass?: string
  ): Promise<any> {
    let result = await this.getDurableKVParamWithMetadata(
      stub,
      key,
      cryptoPass
    );
    return result?.value;
  }

  async deleteDurableKVParamWithMetadata(stub: DurableObject): Promise<any> {
    let request = new Request("https://v1/kv", this.generateHttpInit("DELETE"));
    let response = await stub.fetch(request);
    let result = await response.json();
    return result;
  }

  protected generateHttpInit(
    method: string,
    body?: BodyInit,
    additionalHeaders?: {},
    cf?: RequestInitCfProperties
  ) {
    let headers = {
      "Content-Type": "application/json",
      f2x_request_id: this.id,
      f2x_trace: this.trace.toString(),
    };
    if (additionalHeaders) {
      headers = Object.assign(headers, additionalHeaders);
    }

    let init: {
      method: string;
      headers: {};
      body?: BodyInit;
      cf?: RequestInitCfProperties;
    } = {
      method: method,
      headers: headers,
    };

    if (body) {
      init.body = body;
    }

    if (cf) {
      init.cf = cf;
    }

    return init;
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
      message = {
        requestURL: requestURL,
        requestMethod: requestMethod,
        requestHeaders: requestHeaders,
        requestBody: requestBody,
      };
    }
    return JSON.stringify(message, null, 2);
  }

  protected async getExceptionMessage(exception: any, url: string, body: any) {
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
        message: this.maskInfo(JSON.stringify(exceptionMessage, null, 2)).slice(
          0,
          5000
        ),
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
    let responseBody:any = await responseClone.text();
    if(responseBody) {
      responseBody = JSON.parse(responseBody)
      if(responseBody?.error?.innerErrors?.[0]?.details?.state){
        this.maskArray.push(responseBody.error.innerErrors[0].details.state)
      }
      if(responseBody?.state){
        this.maskArray.push(responseBody.state)
      }
      if(responseBody?.state){
        this.maskArray.push(responseBody.state)
      }
      if(responseBody?.clientId){
        this.maskArray.push(responseBody.clientId)
      }
      if(responseBody?.clientSecret){
        this.maskArray.push(responseBody.clientSecret)
      }
      if(responseBody?.token?.refresh_token){
        this.maskArray.push(responseBody.token.refresh_token)
      }
      if(responseBody?.token?.access_token){
        this.maskArray.push(responseBody.token.access_token)
      }
    }

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
      message = {
        url: responseUrl,
        responseStatus: responseStatus,
        responseHeaders: responseHeaders,
        responseBody: responseBody,
      };
    }
    return JSON.stringify(message, null, 2);
  }

  async callService(
    env: IBaseServiceEnv,
    name: keyof IBindingEnv,
    url: string,
    method: string,
    params?: BodyInit,
    headers?: {}
  ): Promise<any> {
    let service = env[name] as Fetcher;
    let response = await service.fetch(
      `https://${name}/${url}`,
      this.generateHttpInit(method, params, headers)
    );
    return await response.json();
  }

  async callHttp(
    url: string,
    method: string,
    params?: BodyInit,
    headers?: {},
    cf?: RequestInitCfProperties
  ) {
    let request = new Request(
      url,
      this.generateHttpInit(method, params, headers, cf)
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
    let queueStorage = env[queue] as Queue<any>;
    await queueStorage.send(result);
  }

  protected async traceMessage(message: string, type: string, error?: {}) {
    let result = {
      serviceName: this.name,
      type: type,
      id: this.id,
      time: new Date(Date.now()).toISOString(),
      error: error,
      message: this.maskInfo(message).slice(0, 5000),
      trace: this.trace,
    };
    await this.q_trace.send(result);
  }

  private getRandomID() {
    return crypto.randomUUID();
  }
}
