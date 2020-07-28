import { WebAPICallResult, ChatPostMessageArguments, FilesUploadArguments } from '@slack/web-api';
import { IncomingWebhookSendArguments, IncomingWebhookDefaultArguments, IncomingWebhookResult } from '@slack/webhook';
export { ChatPostMessageArguments, IncomingWebhookSendArguments, WebAPICallResult, IncomingWebhookResult };
export declare class SlackAPI {
    private api;
    constructor(token: string);
    uploadScreenshot(options: FilesUploadArguments): Promise<WebAPICallResult>;
    sendMessage(options: ChatPostMessageArguments): Promise<WebAPICallResult>;
}
export declare class SlackWebhook {
    private webhook;
    constructor(webhook: string, defaults?: IncomingWebhookDefaultArguments);
    send(payload: IncomingWebhookSendArguments): Promise<IncomingWebhookResult>;
}
