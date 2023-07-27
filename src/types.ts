/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatPostMessageArguments, FilesUploadArguments } from '@slack/web-api';
import { IncomingWebhookSendArguments } from '@slack/webhook';
import { RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';
import { Suite } from '@wdio/reporter/build/stats/suite';
import { Reporters } from '@wdio/types';
import { SLACK_REQUEST_TYPE } from './constants.js';

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

export type TestResultType = 'passed' | 'failed' | 'pending' | 'skipped';

export interface StateCount {
  passed: number;
  failed: number;
  skipped: number;
}

export class CucumberStats extends SuiteStats {
  state: TestStats['state'];
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
  filterForDetailResults?: TestResultType[];
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

export interface SlackReporterOptions extends Reporters.Options {
  slackOptions?: SlackOptions;
  emojiSymbols?: EmojiSymbols;
  title?: string;
  resultsUrl?: string;
  notifyFailedCase?: boolean;
  notifyTestStartMessage?: boolean;
  notifyTestFinishMessage?: boolean;
  useScenarioBasedStateCounts?: boolean;
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
