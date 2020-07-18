import WDIOReporter from '@wdio/reporter';
import { IncomingWebhookSendArguments } from '@slack/webhook';
interface SlackReporterOptions extends WDIOReporter.Options {
    slackName?: string;
    slackIconUrl?: string;
    webhook?: string;
    attachFailureCase?: boolean;
    notifyTestStartMessage?: boolean;
    resultsUrl?: string;
}
declare interface Hook extends WDIOReporter.Hook {
    error?: WDIOReporter.Error;
}
declare class SlackReporter extends WDIOReporter {
    private slackName;
    private slackIconUrl;
    private webhook;
    private attachFailureCase;
    private notifyTestStartMessage;
    private resultsUrl;
    private failureAttachments;
    private unsynced;
    private stateCounts;
    constructor(options: SlackReporterOptions);
    get isSynchronised(): boolean;
    onRunnerStart(runner: any): void;
    onBeforeCommand(): void;
    onAfterCommand(): void;
    onScreenshot(): void;
    onSuiteStart(): void;
    onHookStart(): void;
    onHookEnd(hook: Hook): void;
    onTestStart(): void;
    onTestPass(): void;
    onTestFail(test: WDIOReporter.Test): void;
    onTestSkip(): void;
    onTestEnd(): void;
    onSuiteEnd(): void;
    onRunnerEnd(runner: any): void;
    sendMessage(payload: IncomingWebhookSendArguments): void;
    createPayloadResult(runner: any): IncomingWebhookSendArguments;
    addFailureAttachments(title: string, errors: WDIOReporter.Error[]): void;
    convertErrorStack(stack: string): string;
    setEnvironment(runner: any): string;
}
export = SlackReporter;
