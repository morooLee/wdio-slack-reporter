/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	ChatPostMessageArguments,
	FilesUploadArguments,
	WebAPICallResult,
} from '@slack/web-api';
import {
	IncomingWebhookResult,
	IncomingWebhookSendArguments,
} from '@slack/webhook';
import { RunnerStats, TestStats } from '@wdio/reporter';
import { EVENTS, SLACK_REQUEST_TYPE } from './constants';

export {
	ChatPostMessageArguments,
	FilesUploadArguments,
	WebAPICallResult,
} from '@slack/web-api';
export {
	IncomingWebhookResult,
	IncomingWebhookSendArguments,
} from '@slack/webhook';

export { RunnerStats, TestStats } from '@wdio/reporter';

export interface StateCount {
	passed: number;
	failed: number;
	skipped: number;
}

export interface EmojiSymbols {
	passed?: string;
	failed?: string;
	skipped?: string;
	pending?: string;
	start?: string;
	finished?: string;
	watch?: string;
}

export interface SlackWebApiOptions {
	type: 'web-api';
	channel: string;
	slackBotToken: string;
	uploadScreenshotOfFailedCase?: boolean;
	notifyDetailResultThread?: boolean;
	createScreenshotPayload?: (
		testStats: TestStats,
		screenshotBuffer: Buffer
	) => FilesUploadArguments;
	createResultDetailPayload?: (
		runnerStats: RunnerStats,
		stateCounts: StateCount
	) => ChatPostMessageArguments;
}
export interface SlackWebhookOptions {
	type: 'webhook';
	webhook: string;
	slackName?: string;
	slackIconUrl?: string;
}

export type SlackOptions = SlackWebApiOptions | SlackWebhookOptions;

export interface SlackReporterOptions {
	slackOptions: SlackOptions;
	emojiSymbols?: EmojiSymbols;
	title?: string;
	resultsUrl?: string;
	notifyFailedCase?: boolean;
	notifyTestStartMessage?: boolean;
	createStartPayload?: (
		runnerStats: RunnerStats
	) => ChatPostMessageArguments | IncomingWebhookSendArguments;
	createFailedTestPayload?: (
		testStats: TestStats
	) => ChatPostMessageArguments | IncomingWebhookSendArguments;
	createResultPayload?: (
		runnerStats: RunnerStats,
		stateCounts: StateCount
	) => ChatPostMessageArguments | IncomingWebhookSendArguments;
}

export type SlackRequestType = PostMessage | Upload | Send;

interface PostMessage {
	type: typeof SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE;
	payload: ChatPostMessageArguments;
	isDetailResult?: boolean;
}
interface Upload {
	type: typeof SLACK_REQUEST_TYPE.WEB_API_UPLOAD;
	payload: FilesUploadArguments;
}
interface Send {
	type: typeof SLACK_REQUEST_TYPE.WEBHOOK_SEND;
	payload: IncomingWebhookSendArguments;
}

declare global {
	namespace NodeJS {
		interface Process {
			emit(
				event: typeof EVENTS.POST_MESSAGE,
				payload: ChatPostMessageArguments
			): boolean;
			emit(
				event: typeof EVENTS.UPLOAD,
				payload: FilesUploadArguments
			): Promise<WebAPICallResult>;
			emit(
				event: typeof EVENTS.SEND,
				payload: IncomingWebhookSendArguments
			): boolean;
			emit(event: typeof EVENTS.SCREENSHOT, buffer: Buffer): boolean;
			emit(
				event: typeof EVENTS.RESULT,
				args: {
					result: WebAPICallResult | IncomingWebhookResult | undefined;
					error: any;
				}
			): boolean;

			on(
				event: typeof EVENTS.POST_MESSAGE,
				listener: (
					payload: ChatPostMessageArguments
				) => Promise<WebAPICallResult>
			): this;
			on(
				event: typeof EVENTS.UPLOAD,
				listener: (payload: FilesUploadArguments) => Promise<WebAPICallResult>
			): this;
			on(
				event: typeof EVENTS.SEND,
				listener: (
					payload: IncomingWebhookSendArguments
				) => Promise<IncomingWebhookResult>
			): this;
			on(
				event: typeof EVENTS.SCREENSHOT,
				listener: (buffer: Buffer) => void
			): this;
			once(
				event: typeof EVENTS.RESULT,
				listener: (args: {
					result: WebAPICallResult | IncomingWebhookResult | undefined;
					error: any;
				}) => Promise<void>
			): this;
		}
	}
	namespace WebdriverIO {
		// eslint-disable-next-line @typescript-eslint/no-empty-interface
		interface ReporterOption extends SlackReporterOptions {}
		interface Browser {
			takeScreenshot(): Promise<string>;
		}
	}
}
