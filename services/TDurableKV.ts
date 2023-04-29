export interface IDurableEnv {}

export class TDurableKV {
  readonly state: DurableObjectState;
  env: IDurableEnv;

  constructor(env: IDurableEnv, state: DurableObjectState) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request) {
    switch (req.method.toUpperCase()) {
      case "GET":
        return await this.handleGetRequest(req);
      case "POST":
        return await this.handlePostRequest(req);
      case "DELETE":
        return await this.handleDeleteRequest(req);
    }
  }

  async alarm() {
    await this.state.storage.delete("all");
  }

  private async handleGetRequest(req: Request) {
    let result = await this.state.storage.get("all");
    if (!result) {
      return new Response(
        JSON.stringify({
          responseStatus: 404,
          responseError: { errorCode: "NOT_FOUND", errorText: "Not found" },
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
    const reqBody: { [key: string]: any } = await req.json();
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

  private async handleDeleteRequest(req: Request) {
    await this.state.storage.delete("all");
    await this.state.storage.deleteAlarm();
    return new Response(
      JSON.stringify({
        responseStatus: 200,
        responseError: null,
        responseResult: "DELETE SUCCESS",
      })
    );
  }
}