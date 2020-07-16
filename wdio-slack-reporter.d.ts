import WDIOReporter from '@wdio/reporter';
import { IncomingWebhookSendArguments } from '@slack/webhook'

export interface SlackReporterOptions extends WDIOReporter.Options {
  slackName?: string;
  slackIconUrl?: string;
  webhook?: string;
  attachFailureCase?: boolean;
  notifyTestStartMessage?: boolean;
  resultsUrl?: string;
}

export declare class SlackReporter extends WDIOReporter {
  constructor(options: SlackReporterOptions);
  
  sendMessage(payload: IncomingWebhookSendArguments): void;
  createPayloadResult(runner: any): IncomingWebhookSendArguments;
  createPayloadAttachFailureCase(failureCase: WDIOReporter.Test | WDIOReporter.Hook): void;
  setEnvironment(runner: any): string;
}