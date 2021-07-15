/// <reference types="node" />
import { ChatPostMessageArguments, FilesUploadArguments, WebAPICallResult } from '@slack/web-api';
import { IncomingWebhookResult, IncomingWebhookSendArguments } from '@slack/webhook';
import WDIOReporter, { HookStats, RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';
import { SlackReporterOptions } from './types';
declare class SlackReporter extends WDIOReporter {
    private static resultsUrl?;
    private _slackRequestQueue;
    private _lastSlackWebAPICallResult?;
    private _pendingSlackRequestCount;
    private _stateCounts;
    private _client?;
    private _webhook?;
    private _channel?;
    private _symbols;
    private _title?;
    private _notifyTestStartMessage;
    private _notifyFailedCase;
    private _uploadScreenshotOfFailedCase;
    private _notifyDetailResultThread;
    private _isSynchronising;
    private _interval;
    private _hasRunnerEnd;
    private _lastScreenshotBuffer?;
    private _suiteUids;
    private _orderedSuites;
    private _indents;
    private _suiteIndents;
    private _currentSuite?;
    constructor(options: SlackReporterOptions);
    static getResultsUrl(): string | undefined;
    static setResultsUrl(url: string | undefined): void;
    /**
     * Upload failed test scrteenshot
     * @param  {WebdriverIO.Browser} browser Parameters used by WebdriverIO.Browser
     * @param  {{page: Page, options: ScreenshotOptions}} puppeteer Parameters used by Puppeteer
     * @return {Promise<Buffer>}
     */
    static uploadFailedTestScreenshot(data: string | Buffer): void;
    /**
     * Post message from Slack web-api
     * @param  {ChatPostMessageArguments} payload Parameters used by Slack web-api
     * @return {Promise<WebAPICallResult>}
     */
    static postMessage(payload: ChatPostMessageArguments): Promise<WebAPICallResult>;
    /**
     * Upload from Slack web-api
     * @param  {FilesUploadArguments} payload Parameters used by Slack web-api
     * @return {WebAPICallResult}
     */
    static upload(payload: FilesUploadArguments): Promise<WebAPICallResult>;
    /**
     * Send from Slack webhook
     * @param  {IncomingWebhookSendArguments} payload Parameters used by Slack webhook
     * @return {IncomingWebhookResult}
     */
    static send(payload: IncomingWebhookSendArguments): Promise<IncomingWebhookResult>;
    private uploadFailedTestScreenshot;
    private postMessage;
    private upload;
    private send;
    get isSynchronised(): boolean;
    private sync;
    private next;
    private convertErrorStack;
    private getEnviromentCombo;
    /**
     * Indent a suite based on where how it's nested
     * @param  {String} uid Unique suite key
     * @return {String}     Spaces for indentation
     */
    private indent;
    /**
     * Indent a suite based on where how it's nested
     * @param  {StateCount} stateCounts Stat count
     * @return {String}     String to the stat count to be displayed in Slack
     */
    private getCounts;
    private createStartPayload;
    private createFailedTestPayload;
    private createScreenshotPayload;
    private createResultPayload;
    private createResultDetailPayload;
    private getResultDetailPayloads;
    private getOrderedSuites;
    /**
     * returns everything worth reporting from a suite
     * @param  {Object}    suite  test suite containing tests and hooks
     * @return {Object[]}         list of events to report
     */
    private getEventsToReport;
    onRunnerStart(runnerStats: RunnerStats): void;
    onSuiteStart(suiteStats: SuiteStats): void;
    onHookEnd(hookStats: HookStats): void;
    onTestPass(testStats: TestStats): void;
    onTestFail(testStats: TestStats): void;
    onTestSkip(testStats: TestStats): void;
    onSuiteEnd(suiteStats: SuiteStats): void;
    onRunnerEnd(runnerStats: RunnerStats): void;
}
export default SlackReporter;
export * from './types';
