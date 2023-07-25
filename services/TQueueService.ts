import { IBaseServiceEnv, TBaseService } from "./TBaseService";

export interface IQueuesServiceEnv extends IBaseServiceEnv {}

export abstract class TQueueService extends TBaseService {
  protected env_trace: number = this.trace;
  constructor(env: IQueuesServiceEnv, name: string, version: string) {
    super(env, name, version);
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
