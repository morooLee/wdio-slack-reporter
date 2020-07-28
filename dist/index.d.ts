import WDIOReporter from '@wdio/reporter';
import { IncomingWebhookSendArguments, WebAPICallResult, IncomingWebhookResult } from './utils';
export interface SlackReporterOptions extends WDIOReporter.Options {
    slackName?: string;
    slackIconUrl?: string;
    channel?: string;
    slackBotToken?: string;
    webhook?: string;
    attachFailedCase?: boolean;
    uploadScreenshotOfFailedCase?: boolean;
    notifyTestStartMessage?: boolean;
    resultsUrl?: string;
}
interface Hook extends WDIOReporter.Hook {
    error?: WDIOReporter.Error;
    errors?: WDIOReporter.Error[];
}
interface Test extends WDIOReporter.Test {
    uid?: string;
}
export declare class SlackReporter extends WDIOReporter {
    private slackName;
    private slackIconUrl;
    private channel?;
    private api?;
    private webhook?;
    private isWebhook;
    private attachFailureCase;
    private uploadScreenshotOfFailedCase;
    private notifyTestStartMessage;
    private resultsUrl;
    private isCompletedReport;
    private stateCounts;
    private failedMetaData;
    constructor(options: SlackReporterOptions);
    get isSynchronised(): boolean;
    onRunnerStart(runner: any): void;
    onHookEnd(hook: Hook): void;
    onTestPass(): void;
    onTestFail(test: Test): Promise<void>;
    onTestSkip(): void;
    onRunnerEnd(runner: any): Promise<void>;
    sendMessage(payload: IncomingWebhookSendArguments): Promise<IncomingWebhookResult | WebAPICallResult>;
    sendResultMessage(runner: any): Promise<void>;
    sendFailedTestMessage(): Promise<void>;
    convertErrorStack(stack: string): string;
    setEnvironment(runner: any): string;
}
export {};
