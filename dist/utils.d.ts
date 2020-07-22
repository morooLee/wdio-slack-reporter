/// <reference types="node" />
import { WebAPICallResult } from '@slack/web-api';
export default class SlackAPI {
    private client;
    private app;
    constructor(token: string, signingSecret: string);
    uploadScreenshot(buffer: Buffer): Promise<string>;
}
export declare const uploadScreenshot: (token: string, buffer: Buffer) => Promise<WebAPICallResult>;
