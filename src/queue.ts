/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { EVENTS, SLACK_REQUEST_TYPES } from './constants.js';
import { logger } from './utils.js';

import type { SlackWebClient, SlackWebhook } from './client.js';
import type {
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesUploadV2Arguments,
  FilesUploadV2Response,
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
  SlackResult,
  SlackTask,
} from './types.js';

export default class SlackQueue extends EventEmitter {
  public client?: SlackWebClient;
  public webhook?: SlackWebhook;
  public firstThread?: string;
  public nextInitialThread?: string;
  public latestThread?: string;
  private _tasks: SlackTask[];
  private _processing: boolean;
  private _stopRequested: boolean;
  private _interval: NodeJS.Timeout;
  private _isEnded: boolean;

  constructor() {
    super();

    this._tasks = [];
    this._processing = false;
    this._stopRequested = false;
    this._interval = setInterval(this._sync.bind(this), 500);
    this._isEnded = false;
  }

  public get size(): number {
    return this._tasks.length;
  }

  public get isProcessing(): boolean {
    return this._processing;
  }

  public get isEnded(): boolean {
    return this._isEnded;
  }

  private _enqueue(task: SlackTask): void {
    this._tasks.push(task);
  }

  private async _sync(): Promise<void> {
    if (this._stopRequested && this._tasks.length === 0 && !this._processing) {
      clearInterval(this._interval);
      this._isEnded = true;
      return;
    }
    if (this._tasks.length === 0 || this._processing) {
      return;
    }

    try {
      logger.info('Start Synchronising...');
      await this._next();
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      logger.info('End Synchronising!!!');
    }
  }
  private async _next(): Promise<void> {
    let result: SlackResult | undefined = undefined;

    const task = this._tasks.shift();

    if (task) {
      try {
        this._processing = true;

        switch (task.type) {
          case SLACK_REQUEST_TYPES.WEB_API_POST_MESSAGE: {
            const { reply_in_thread: replyInThread = true, ...rest } =
              task.payload;
            if (this.client) {
              result = await this.client.postMessage({
                thread_ts: replyInThread ? this.nextInitialThread : undefined,
                ...rest,
              });
            }

            if (result) {
              if (!this.firstThread) {
                this.firstThread = result.ts;
                this.nextInitialThread = result.ts;
              }
              if (!task.payload.reply_in_thread) {
                this.nextInitialThread = result.ts;
              }
              this.latestThread = result.ts;
            }

            break;
          }
          case SLACK_REQUEST_TYPES.WEB_API_UPLOAD: {
            if (this.client) {
              result = await this.client.uploadV2(
                task.payload,
                task.waitForUpload
              );
            }
            break;
          }
          case SLACK_REQUEST_TYPES.WEBHOOK_SEND: {
            if (this.webhook) {
              result = await this.webhook.send(task.payload);
            }
            break;
          }
        }

        if (result) {
          this.emit(EVENTS.RESULT + ':' + task.id, { result });
        }
      } catch (error) {
        logger.error(error);
        this.emit(EVENTS.RESULT + ':' + task.id, { error });
      } finally {
        this._processing = false;
      }

      if (this._tasks.length > 0) {
        await this._next();
      }
    }
  }

  public enqueue(
    type: 'web-api' | 'webhook',
    event: (typeof EVENTS)[keyof typeof EVENTS],
    payloads:
      | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
      | (string | IncomingWebhookSendArguments)[]
  ): void {
    switch (type) {
      case 'web-api': {
        const type = SLACK_REQUEST_TYPES.WEB_API_POST_MESSAGE;

        for (const payload of payloads as (ChatPostMessageArguments & {
          reply_in_thread?: boolean;
        })[]) {
          const id = randomUUID().toString();

          this._enqueue({
            id,
            type,
            event,
            payload,
          });
        }
        break;
      }
      case 'webhook': {
        const type = SLACK_REQUEST_TYPES.WEBHOOK_SEND;

        for (const payload of payloads as IncomingWebhookSendArguments[]) {
          const id = randomUUID().toString();

          this._enqueue({
            id,
            type,
            event,
            payload,
          });
        }
        break;
      }
    }
  }

  public async postMessage(
    payload: ChatPostMessageArguments
  ): Promise<ChatPostMessageResponse> {
    const id = randomUUID().toString();
    const type = SLACK_REQUEST_TYPES.WEB_API_POST_MESSAGE;
    const event = EVENTS.POST_MESSAGE;

    return new Promise((resolve, reject) => {
      this._enqueue({ id, type, event, payload });
      this.once(EVENTS.RESULT + ':' + id, ({ result, error }) => {
        if (result) {
          resolve(result);
        }

        reject(error);
      });
    });
  }

  public async upload(
    payload: FilesUploadV2Arguments,
    waitForUpload: boolean = true
  ): Promise<FilesUploadV2Response> {
    const id = randomUUID().toString();
    const type = SLACK_REQUEST_TYPES.WEB_API_UPLOAD;
    const event = EVENTS.UPLOAD;

    return new Promise((resolve, reject) => {
      this._enqueue({ id, type, event, payload, waitForUpload });
      this.once(EVENTS.RESULT + ':' + id, ({ result, error }) => {
        if (result) {
          resolve(result);
        }

        reject(error);
      });
    });
  }

  public async send(
    payload: string | IncomingWebhookSendArguments
  ): Promise<IncomingWebhookResult> {
    const id = randomUUID().toString();
    const type = SLACK_REQUEST_TYPES.WEBHOOK_SEND;
    const event = EVENTS.POST_MESSAGE;

    return new Promise((resolve, reject) => {
      this._enqueue({ id, type, event, payload });
      this.once(EVENTS.RESULT + ':' + id, ({ result, error }) => {
        if (result) {
          resolve(result);
        }

        reject(error);
      });
    });
  }

  public stop(): void {
    this._stopRequested = true;
  }
}
