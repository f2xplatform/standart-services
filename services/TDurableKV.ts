export interface IDurableKVEnv {}

export class TDurableKV {
  protected key: string;
  protected value: string;
  protected expire: number;
  protected meta: { [key: string]: any };
  private readonly state: DurableObjectState;
  private env: IDurableKVEnv;

  constructor(env: IDurableKVEnv, state: DurableObjectState) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      let stored: {
        key: string;
        value: string;
        expire: number;
        meta: { [key: string]: any };
      } = await this.state.storage.get("all");
      this.key = stored?.key;
      this.value = stored?.value;
      this.expire = stored?.expire;
      this.meta = stored?.meta;
    });
  }

  async fetch(req: Request) {
    switch (req.method.toUpperCase()) {
      case "GET":
        return await this.handleGetRequest(req);
      case "POST":
        return await this.handlePostRequest(req);
    }
  }

  async alarm() {
    await this.state.storage.delete("all");
    this.key = null;
    this.value = null;
    this.expire = null;
    this.meta = null;
  }

  private async handleGetRequest(req: Request) {
    let result = await this.state.storage.get("all");
    if (!result) {
      return new Response(
        JSON.stringify({
          responseStatus: 404,
          responseError: "Not found",
          responseResult: null,
        })
      );
    } else {
      return new Response(
        JSON.stringify({
          responseStatus: 200,
          responseError: null,
          responseResult: result,
        })
      );
    }
  }

  private async handlePostRequest(req: Request) {
    const reqBody: { [key: string]: any } = await req.clone().json();
    await this.state.storage.put("all", reqBody);
    if (reqBody?.expire) {
      await this.state.storage.setAlarm(Date.now() + reqBody.expire);
    }
    return new Response(
      JSON.stringify({
        responseStatus: 200,
        responseError: null,
        responseResult: reqBody,
      })
    );
  }
}
