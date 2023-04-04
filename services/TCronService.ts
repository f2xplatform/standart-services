import { IBaseServiceEnv, TBaseService } from "./TBaseService";

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
