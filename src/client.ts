/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WebClient, IncomingWebhook, TimeoutError } from './types.js';
import { logger, waitForTimeout } from './utils.js';

import type {
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesCompleteUploadExternalArguments,
  FilesCompleteUploadExternalResponse,
  FilesGetUploadURLExternalArguments,
  FilesGetUploadURLExternalResponse,
  FilesInfoArguments,
  FilesInfoResponse,
  FilesUploadV2Arguments,
  FilesUploadV2Response,
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
  SlackWebClientOptions,
  SlackWebhookOptions,
} from './types.js';

/**
 * A client wrapper for Slack's WebClient API that simplifies common operations.
 *
 * This class provides methods for posting messages, uploading files, and interacting
 * with Slack's API in a more convenient way.
 *
 * @example
 * ```typescript
 * const slackClient = new SlackWebClient({
 *   token: 'xoxb-your-token-here'
 * });
 *
 * // Post a message
 * await slackClient.postMessage({
 *   channel: 'C12345',
 *   text: 'Hello from WebdriverIO!'
 * });
 *
 * // Upload a file
 * await slackClient.upload({
 *   channel_id: 'C12345',
 *   file: '/path/to/report.html',
 *   title: 'Test Report'
 * });
 * ```
 */
class SlackWebClient {
  private _token: string;
  private _client: WebClient;

  /**
   * Creates an instance of the Slack client.
   *
   * @param {SlackWebClientOptions | undefined} options - The options for configuring the Slack client, excluding 'type' and 'channel'.
   */
  constructor(options: SlackWebClientOptions) {
    const { token, ...rest } = options;

    this._client = new WebClient(token, rest);
    this._token = token;
  }

  /**
   * Gets the authentication token for the Slack API.
   * @returns The current token value or undefined if not set.
   */
  public get token(): string | undefined {
    return this._token;
  }

  /**
   * Gets the Slack WebClient instance.
   * @returns {WebClient} The Slack WebClient instance used for API interactions.
   */
  public get client(): WebClient {
    return this._client;
  }

  /**
   * Posts a message to a Slack channel.
   *
   * @param payload - The arguments for posting a message to Slack
   * @returns A promise that resolves to the chat post message response
   * @throws Will throw and log an error if the message posting fails
   */
  public async postMessage(
    payload: ChatPostMessageArguments
  ): Promise<ChatPostMessageResponse> {
    try {
      const response = await this._client.chat.postMessage(payload);

      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * Uploads files to Slack using the Slack API
   *
   * @param payload - The arguments for the Slack files.uploadV2 API
   * @param waitForUpload - Whether to wait for the upload to complete, defaults to true
   * @returns A promise that resolves to the Slack files.uploadV2 API response
   * @throws Will throw an error if the upload fails
   *
   * @example
   * const response = await slackClient.uploadV2({
   *   channel_id: "C12345",
   *   file: "path/to/file",
   *   token: "xoxb-token"
   * });
   */
  public async uploadV2(
    payload: FilesUploadV2Arguments,
    waitForUpload: boolean = true
  ): Promise<FilesUploadV2Response> {
    // Slack 파일 업로드 API 호출
    try {
      const response = await this._client.filesUploadV2(payload);

      // 업로드가 성공적이면
      if (waitForUpload && response.ok) {
        const files = response.files?.flatMap((file) => file.files) ?? [];

        // 각 파일에 대해 업로드 완료까지 대기
        for await (const file of files) {
          try {
            if (file?.id) {
              await this.waitForUpload(file.id, payload.token);
            }
          } catch (error) {
            logger.error(error);
          }
        }
      }

      // 최종 업로드 응답 반환
      return response;
    } catch (error) {
      logger.error(error);
      throw error; // 업로드 실패 시 에러 반환
    }
  }

  /**
   * Waits for a file to be processed and uploaded on Slack.
   * This method repeatedly checks the file info until the file's mimetype is available,
   * indicating that the file has been successfully processed.
   *
   * @param fileId - The ID of the file to check
   * @param timeout - Maximum time in milliseconds to wait for the file upload (default: 30000)
   * @param interval - Time in milliseconds between each check (default: 1000)
   * @returns A Promise that resolves to the FilesInfoResponse once the file is processed
   * @throws {TimeoutError} If the file is not processed within the specified timeout
   * @throws {Error} If any error occurs during the file info retrieval
   */
  public async waitForUpload(
    fileId: string,
    token?: string,
    timeout: number = 30000,
    interval: number = 1000
  ): Promise<FilesInfoResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.filesInfo({
          token: token ?? this._token,
          file: fileId,
        });

        if (response?.file?.mimetype) {
          return response;
        }
      } catch (error) {
        logger.error(error);
        throw error;
      }

      await waitForTimeout(interval);
    }

    throw new TimeoutError(
      `Timeout: No file info(mimetype) found within ${timeout / 1000} seconds`
    );
  }

  /**
   * Retrieves information about a file.
   *
   * @param options - Arguments for retrieving file information
   * @returns A promise that resolves to the file information response
   *
   * @example
   * ```typescript
   * const fileInfo = await client.filesInfo({
   *   file: "F123456789"
   * });
   * ```
   */
  public async filesInfo(
    options: FilesInfoArguments
  ): Promise<FilesInfoResponse> {
    try {
      const response = await this._client.files.info(options);

      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * Retrieves an external upload URL for files.
   *
   * @param options - The arguments for the external upload URL request
   * @returns A promise that resolves to a FilesGetUploadURLExternalResponse
   * @throws Will throw and log any errors that occur during the request
   */
  public async getUploadURLExternal(
    options: FilesGetUploadURLExternalArguments
  ): Promise<FilesGetUploadURLExternalResponse> {
    try {
      const response = await this._client.files.getUploadURLExternal(options);

      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * Completes an external file upload process.
   * Calls the Slack API's files.completeUploadExternal method.
   *
   * @param options - Arguments required for completing an external upload
   * @returns A promise resolving to the response from the Slack API
   * @throws Will throw and log any errors that occur during the API call
   */
  public async completeUploadExternal(
    options: FilesCompleteUploadExternalArguments
  ): Promise<FilesCompleteUploadExternalResponse> {
    try {
      const response = await this._client.files.completeUploadExternal(options);

      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}

/**
 * A class that provides an interface for sending messages to Slack via webhooks.
 *
 * This class wraps the Slack IncomingWebhook functionality and provides a simplified
 * interface for sending messages to a Slack channel.
 *
 * @example
 * ```typescript
 * const webhook = new SlackWebhook({
 *   webhook: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
 *   username: 'WebdriverIO Reporter'
 * });
 *
 * await webhook.send('Test message');
 * ```
 */
class SlackWebhook {
  private _url: string;
  private _webhook: IncomingWebhook;

  /**
   * Constructs a new instance of the SlackClient.
   * @param {SlackWebhookOptions} options - Configuration options for the Slack webhook.
   */
  constructor(options: SlackWebhookOptions) {
    const { webhook: url, ...rest } = options;

    this._url = url;
    this._webhook = new IncomingWebhook(url, rest);
  }

  /**
   * Gets the URL for the Slack webhook.
   * @returns The URL string for the Slack webhook.
   */
  public get url(): string {
    return this._url;
  }

  /**
   * Gets the Slack IncomingWebhook instance.
   *
   * @returns {IncomingWebhook} The configured Slack webhook client
   */
  public get webhook(): IncomingWebhook {
    return this._webhook;
  }

  /**
   * Sends a payload to Slack via webhook.
   *
   * @param payload - The content to send to Slack. Can be either a string or an IncomingWebhookSendArguments object.
   * @returns A Promise that resolves with the IncomingWebhookResult from Slack.
   * @throws Will re-throw any error that occurs during the send operation after logging it.
   */
  public async send(
    payload: string | IncomingWebhookSendArguments
  ): Promise<IncomingWebhookResult> {
    try {
      const response = await this._webhook.send(payload);

      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}

export { SlackWebClient, SlackWebhook };
