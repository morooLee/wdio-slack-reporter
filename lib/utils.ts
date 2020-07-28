import { WebClient, WebAPICallResult, ChatPostMessageArguments, FilesUploadArguments } from '@slack/web-api';
import { IncomingWebhook, IncomingWebhookSendArguments, IncomingWebhookDefaultArguments, IncomingWebhookResult } from '@slack/webhook';

export { ChatPostMessageArguments, IncomingWebhookSendArguments, WebAPICallResult, IncomingWebhookResult };

export class SlackAPI {
  private api: WebClient;

  constructor(token: string) {
    this.api = new WebClient(token)
  }
  async uploadScreenshot(options: FilesUploadArguments) {
    try {
      const uploadRes: WebAPICallResult = await this.api.files.upload(options);
      
      if (uploadRes.ok) {
        return uploadRes;
        // return (uploadRes.file as any).url_private;
        // const sharedPublicURLRes: WebAPICallResult = await this.api.files.sharedPublicURL({
        //   file: (uploadRes.file as any).id,
        // })
        // if (sharedPublicURLRes.ok) {
        //   const parsedPermalink = (sharedPublicURLRes.file as any).permalink_public.split('-');
        //   const pubSecret = parsedPermalink[parsedPermalink.length - 1];

        //   return (sharedPublicURLRes.file as any).url_private + `?pub_secret=${pubSecret}`
        // }
        // else {
        //   throw sharedPublicURLRes.error;
        // }
      }
      else {
        throw uploadRes.error;
      }
    }
    catch(error) {
      throw error;
    }
  }

  async sendMessage(options: ChatPostMessageArguments): Promise<WebAPICallResult> {
    try {
      const result =  await this.api.chat.postMessage(options)
      
      if (result.ok) {
        return result;
      }
      else {
        throw result.error;
      }
    }
    catch (error) {
      throw error;
    }
  }
}
export class SlackWebhook {
  private webhook: IncomingWebhook;

  constructor(webhook: string, defaults?: IncomingWebhookDefaultArguments) {
    this.webhook = new IncomingWebhook(webhook, defaults)
  }

  async send(payload: IncomingWebhookSendArguments): Promise<IncomingWebhookResult> {
    try {
      const result = await this.webhook.send(payload);

      if (result.text === 'ok') {
        return result;
      }
      else {
        throw result;
      }
    }
    catch (error) {
      throw (error);
    }
  }
}