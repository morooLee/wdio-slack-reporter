"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_api_1 = require("@slack/web-api");
const webhook_1 = require("@slack/webhook");
const logger_1 = __importDefault(require("@wdio/logger"));
const reporter_1 = __importDefault(require("@wdio/reporter"));
const constants_1 = require("./constants");
const log = logger_1.default('@moroo/wdio-slack-reporter');
class SlackReporter extends reporter_1.default {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        super(Object.assign({ stdout: true }, options));
        this._slackRequestQueue = [];
        this._pendingSlackRequestCount = 0;
        this._stateCounts = {
            passed: 0,
            failed: 0,
            skipped: 0,
        };
        this._notifyTestStartMessage = true;
        this._notifyFailedCase = true;
        this._uploadScreenshotOfFailedCase = true;
        this._notifyDetailResultThread = true;
        this._isSynchronising = false;
        this._hasRunnerEnd = false;
        this._lastScreenshotBuffer = undefined;
        this._suiteUids = new Set();
        this._orderedSuites = [];
        this._indents = 0;
        this._suiteIndents = {};
        if (options.slackOptions.type === 'web-api') {
            this._client = new web_api_1.WebClient(options.slackOptions.slackBotToken);
            log.info('Created Slack Web API Client Instance.');
            log.debug('Slack Web API Client', {
                token: options.slackOptions.slackBotToken,
                channel: options.slackOptions.channel,
            });
            this._channel = options.slackOptions.channel;
            if (options.slackOptions.notifyDetailResultThread !== undefined) {
                this._notifyDetailResultThread =
                    options.slackOptions.notifyDetailResultThread;
            }
            if (options.slackOptions.uploadScreenshotOfFailedCase !== undefined) {
                this._uploadScreenshotOfFailedCase =
                    options.slackOptions.uploadScreenshotOfFailedCase;
            }
            if (options.slackOptions.createScreenshotPayload) {
                this.createScreenshotPayload =
                    options.slackOptions.createScreenshotPayload.bind(this);
                log.info('The [createScreenshotPayload] function has been overridden.');
                log.debug('RESULT', this.createScreenshotPayload.toString());
            }
            if (options.slackOptions.createResultDetailPayload) {
                this.createResultDetailPayload =
                    options.slackOptions.createResultDetailPayload.bind(this);
                log.info('The [createResultDetailPayload] function has been overridden.');
                log.debug('RESULT', this.createResultDetailPayload.toString());
            }
        }
        else {
            this._webhook = new webhook_1.IncomingWebhook(options.slackOptions.webhook, {
                username: options.slackOptions.slackName || constants_1.SLACK_NAME,
                icon_url: options.slackOptions.slackIconUrl || constants_1.SLACK_ICON_URL,
            });
            log.info('Created Slack Webhook Instance.');
            log.debug('IncomingWebhook', {
                webhook: options.slackOptions.webhook,
                username: options.slackOptions.slackName || constants_1.SLACK_NAME,
                icon_url: options.slackOptions.slackIconUrl || constants_1.SLACK_ICON_URL,
            });
        }
        this._symbols = {
            passed: ((_a = options.emojiSymbols) === null || _a === void 0 ? void 0 : _a.passed) || constants_1.EMOJI_SYMBOLS.PASSED,
            skipped: ((_b = options.emojiSymbols) === null || _b === void 0 ? void 0 : _b.skipped) || constants_1.EMOJI_SYMBOLS.SKIPPED,
            failed: ((_c = options.emojiSymbols) === null || _c === void 0 ? void 0 : _c.failed) || constants_1.EMOJI_SYMBOLS.FAILED,
            pending: ((_d = options.emojiSymbols) === null || _d === void 0 ? void 0 : _d.pending) || constants_1.EMOJI_SYMBOLS.PENDING,
            start: ((_e = options.emojiSymbols) === null || _e === void 0 ? void 0 : _e.start) || constants_1.EMOJI_SYMBOLS.ROKET,
            finished: ((_f = options.emojiSymbols) === null || _f === void 0 ? void 0 : _f.finished) || constants_1.EMOJI_SYMBOLS.CHECKERED_FLAG,
            watch: ((_g = options.emojiSymbols) === null || _g === void 0 ? void 0 : _g.watch) || constants_1.EMOJI_SYMBOLS.STOPWATCH,
        };
        this._title = options.title;
        SlackReporter.setResultsUrl(options.resultsUrl);
        if (options.notifyTestStartMessage !== undefined) {
            this._notifyTestStartMessage = options.notifyTestStartMessage;
        }
        if (options.notifyFailedCase !== undefined) {
            this._notifyFailedCase = options.notifyFailedCase;
        }
        this._interval = global.setInterval(this.sync.bind(this), 100);
        if (options.createStartPayload) {
            this.createStartPayload = options.createStartPayload.bind(this);
            log.info('The [createStartPayload] function has been overridden.');
            log.debug('RESULT', this.createStartPayload.toString());
        }
        if (options.createFailedTestPayload) {
            this.createFailedTestPayload = options.createFailedTestPayload.bind(this);
            log.info('The [createFailedTestPayload] function has been overridden.');
            log.debug('RESULT', this.createFailedTestPayload.toString());
        }
        if (options.createResultPayload) {
            this.createResultPayload = options.createResultPayload.bind(this);
            log.info('The [createResultPayload] function has been overridden.');
            log.debug('RESULT', this.createResultPayload.toString());
        }
        process.on(constants_1.EVENTS.POST_MESSAGE, this.postMessage.bind(this));
        process.on(constants_1.EVENTS.UPLOAD, this.upload.bind(this));
        process.on(constants_1.EVENTS.SEND, this.send.bind(this));
        process.on(constants_1.EVENTS.SCREENSHOT, this.uploadFailedTestScreenshot.bind(this));
    }
    static getResultsUrl() {
        return this.resultsUrl;
    }
    static setResultsUrl(url) {
        this.resultsUrl = url;
    }
    /**
     * Upload failed test scrteenshot
     * @param  {WebdriverIO.Browser} browser Parameters used by WebdriverIO.Browser
     * @param  {{page: Page, options: ScreenshotOptions}} puppeteer Parameters used by Puppeteer
     * @return {Promise<Buffer>}
     */
    static uploadFailedTestScreenshot(data) {
        let buffer;
        if (typeof data === 'string') {
            buffer = Buffer.from(data, 'base64');
        }
        else {
            buffer = data;
        }
        process.emit(constants_1.EVENTS.SCREENSHOT, buffer);
    }
    /**
     * Post message from Slack web-api
     * @param  {ChatPostMessageArguments} payload Parameters used by Slack web-api
     * @return {Promise<WebAPICallResult>}
     */
    static postMessage(payload) {
        return new Promise((resolve, reject) => {
            process.emit(constants_1.EVENTS.POST_MESSAGE, payload);
            process.once(constants_1.EVENTS.RESULT, ({ result, error }) => {
                if (result) {
                    resolve(result);
                }
                reject(error);
            });
        });
    }
    /**
     * Upload from Slack web-api
     * @param  {FilesUploadArguments} payload Parameters used by Slack web-api
     * @return {WebAPICallResult}
     */
    static upload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                process.emit(constants_1.EVENTS.UPLOAD, payload);
                process.once(constants_1.EVENTS.RESULT, ({ result, error }) => {
                    if (result) {
                        resolve(result);
                    }
                    reject(error);
                });
            });
        });
    }
    /**
     * Send from Slack webhook
     * @param  {IncomingWebhookSendArguments} payload Parameters used by Slack webhook
     * @return {IncomingWebhookResult}
     */
    static send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                process.emit(constants_1.EVENTS.SEND, payload);
                process.once(constants_1.EVENTS.RESULT, ({ result, error }) => {
                    if (result) {
                        resolve(result);
                    }
                    reject(error);
                });
            });
        });
    }
    uploadFailedTestScreenshot(buffer) {
        if (this._client) {
            if (this._notifyFailedCase && this._uploadScreenshotOfFailedCase) {
                this._lastScreenshotBuffer = buffer;
                return;
            }
            else {
                log.warn(constants_1.ERROR_MESSAGES.DISABLED_OPTIONS);
            }
        }
        else {
            log.warn(constants_1.ERROR_MESSAGES.NOT_USING_WEB_API);
        }
        // return new Promise((resolve, reject) => {
        // 	const interval = setInterval(() => {
        // 		if (this._lastScreenshotBuffer === undefined) {
        // 			clearInterval(interval);
        // 			if (this._client && this._notifyFailedCase) {
        // 				this._lastScreenshotBuffer = buffer;
        // 			} else {
        // 				log.warn(
        // 					ERROR_MESSAGES.NOT_USING_WEB_API_OR_DISABLED_NOTIFY_FAILED_CASE
        // 				);
        // 			}
        // 			resolve();
        // 		}
        // 	}, 100);
        // });
    }
    postMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._client) {
                try {
                    log.debug('COMMAND', `postMessage(${payload})`);
                    this._pendingSlackRequestCount++;
                    const result = yield this._client.chat.postMessage(payload);
                    log.debug('RESULT', result);
                    process.emit(constants_1.EVENTS.RESULT, { result, error: undefined });
                    return result;
                }
                catch (error) {
                    log.error(error);
                    process.emit(constants_1.EVENTS.RESULT, { result: undefined, error });
                    throw error;
                }
                finally {
                    this._pendingSlackRequestCount--;
                }
            }
            log.error(constants_1.ERROR_MESSAGES.NOT_USING_WEB_API);
            throw new Error(constants_1.ERROR_MESSAGES.NOT_USING_WEB_API);
        });
    }
    upload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._client) {
                try {
                    log.debug('COMMAND', `upload(${payload})`);
                    this._pendingSlackRequestCount++;
                    const result = yield this._client.files.upload(payload);
                    log.debug('RESULT', result);
                    process.emit(constants_1.EVENTS.RESULT, { result, error: undefined });
                    return result;
                }
                catch (error) {
                    log.error(error);
                    process.emit(constants_1.EVENTS.RESULT, { result: undefined, error });
                    throw error;
                }
                finally {
                    this._pendingSlackRequestCount--;
                }
            }
            log.error(constants_1.ERROR_MESSAGES.NOT_USING_WEB_API);
            throw new Error(constants_1.ERROR_MESSAGES.NOT_USING_WEB_API);
        });
    }
    send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._webhook) {
                try {
                    log.debug('COMMAND', `send(${payload})`);
                    this._pendingSlackRequestCount++;
                    const result = yield this._webhook.send(payload);
                    log.debug('RESULT', result);
                    process.emit(constants_1.EVENTS.RESULT, { result, error: undefined });
                    return result;
                }
                catch (error) {
                    log.error(error);
                    process.emit(constants_1.EVENTS.RESULT, { result: undefined, error });
                    throw error;
                }
                finally {
                    this._pendingSlackRequestCount--;
                }
            }
            log.error(constants_1.ERROR_MESSAGES.NOT_USING_WEBHOOK);
            throw new Error(constants_1.ERROR_MESSAGES.NOT_USING_WEBHOOK);
        });
    }
    get isSynchronised() {
        return (this._pendingSlackRequestCount === 0 && this._isSynchronising === false);
    }
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._hasRunnerEnd &&
                this._slackRequestQueue.length === 0 &&
                this._pendingSlackRequestCount === 0) {
                clearInterval(this._interval);
            }
            if (this._isSynchronising ||
                this._slackRequestQueue.length === 0 ||
                this._pendingSlackRequestCount > 0) {
                return;
            }
            try {
                this._isSynchronising = true;
                log.info('Start Synchronising...');
                yield this.next();
            }
            catch (error) {
                log.error(error);
                throw error;
            }
            finally {
                this._isSynchronising = false;
                log.info('End Synchronising!!!');
            }
        });
    }
    next() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const request = this._slackRequestQueue.shift();
            let result;
            log.info('POST', `Slack Request ${request === null || request === void 0 ? void 0 : request.type}`);
            log.debug('DATA', request === null || request === void 0 ? void 0 : request.payload);
            if (request) {
                try {
                    this._pendingSlackRequestCount++;
                    switch (request.type) {
                        case constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE: {
                            if (this._client) {
                                result = yield this._client.chat.postMessage(Object.assign(Object.assign({}, request.payload), { thread_ts: request.isDetailResult
                                        ? (_a = this._lastSlackWebAPICallResult) === null || _a === void 0 ? void 0 : _a.ts
                                        : undefined }));
                                this._lastSlackWebAPICallResult = result;
                                log.debug('RESULT', result);
                            }
                            break;
                        }
                        case constants_1.SLACK_REQUEST_TYPE.WEB_API_UPLOAD: {
                            if (this._client) {
                                result = yield this._client.files.upload(Object.assign(Object.assign({}, request.payload), { thread_ts: (_b = this._lastSlackWebAPICallResult) === null || _b === void 0 ? void 0 : _b.ts }));
                                log.debug('RESULT', result);
                            }
                            break;
                        }
                        case constants_1.SLACK_REQUEST_TYPE.WEBHOOK_SEND: {
                            if (this._webhook) {
                                result = yield this._webhook.send(request.payload);
                                log.debug('RESULT', result);
                            }
                            break;
                        }
                    }
                }
                catch (error) {
                    log.error(error);
                }
                finally {
                    this._pendingSlackRequestCount--;
                }
                if (this._slackRequestQueue.length > 0) {
                    yield this.next();
                }
            }
        });
    }
    convertErrorStack(stack) {
        return stack.replace(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }
    getEnviromentCombo(capability, isMultiremote = false) {
        let output = '';
        const capabilities = capability
            .alwaysMatch ||
            capability;
        const drivers = [];
        if (isMultiremote) {
            output += '*MultiRemote*: \n';
            Object.keys(capabilities).forEach((key) => {
                drivers.push({
                    driverName: key,
                    capability: capabilities[key],
                });
            });
        }
        else {
            drivers.push({
                capability: capabilities,
            });
        }
        drivers.forEach(({ driverName, capability }, index, array) => {
            const isLastIndex = array.length - 1 === index;
            let env = '';
            const caps = capability
                .alwaysMatch ||
                capability;
            const device = caps.deviceName;
            const browser = caps.browserName || caps.browser;
            const version = caps.browserVersion ||
                caps.version ||
                caps.platformVersion ||
                caps.browser_version;
            const platform = caps.platformName ||
                caps.platform ||
                (caps.os
                    ? caps.os + (caps.os_version ? ` ${caps.os_version}` : '')
                    : '(unknown)');
            if (device) {
                const program = (caps.app || '').replace('sauce-storage:', '') || caps.browserName;
                const executing = program ? `executing ${program}` : '';
                env = `${device} on ${platform} ${version} ${executing}`.trim();
            }
            else {
                env = browser + (version ? ` (v${version})` : '') + ` on ${platform}`;
            }
            output += isMultiremote ? `- *${driverName}*: ` : '*Driver*: ';
            output += env;
            output += isLastIndex ? '' : '\n';
        });
        return output;
    }
    /**
     * Indent a suite based on where how it's nested
     * @param  {String} uid Unique suite key
     * @return {String}     Spaces for indentation
     */
    indent(uid) {
        const indents = this._suiteIndents[uid];
        return indents === 0 ? '' : Array(indents).join(constants_1.DEFAULT_INDENT);
    }
    /**
     * Indent a suite based on where how it's nested
     * @param  {StateCount} stateCounts Stat count
     * @return {String}     String to the stat count to be displayed in Slack
     */
    getCounts(stateCounts) {
        return `*${this._symbols.passed} Passed: ${stateCounts.passed} | ${this._symbols.failed} Failed: ${stateCounts.failed} | ${this._symbols.skipped} Skipped: ${stateCounts.skipped}*`;
    }
    createStartPayload(runnerStats) {
        const text = `${this._title && '*Title*: `' + this._title + '`\n'}${this.getEnviromentCombo(runnerStats.capabilities, runnerStats.isMultiremote)}`;
        const payload = {
            channel: this._channel,
            text: `${this._symbols.start} Start testing${this._title && 'for ' + this._title}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${this._symbols.start} Start testing`,
                        emoji: true,
                    },
                },
            ],
            attachments: [
                {
                    color: constants_1.DEFAULT_COLOR,
                    text,
                    ts: Date.now().toString(),
                },
            ],
        };
        return payload;
    }
    createFailedTestPayload(hookAndTest) {
        var _a;
        const stack = ((_a = hookAndTest.error) === null || _a === void 0 ? void 0 : _a.stack)
            ? '```' + this.convertErrorStack(hookAndTest.error.stack) + '```'
            : '';
        const payload = {
            channel: this._channel,
            text: `${this._symbols.failed} Test failure`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${this._symbols.failed} Test failure`,
                        emoji: true,
                    },
                },
            ],
            attachments: [
                {
                    color: constants_1.FAILED_COLOR,
                    title: `${this._currentSuite ? this._currentSuite.title : hookAndTest.parent}`,
                    text: `* » ${hookAndTest.title}*\n${stack}`,
                },
            ],
        };
        return payload;
    }
    createScreenshotPayload(testStats, screenshotBuffer) {
        const payload = {
            channels: this._channel,
            initial_comment: `Screenshot for Fail to ${testStats.title}`,
            filename: `${testStats.uid}.png`,
            filetype: 'png',
            file: screenshotBuffer,
        };
        return payload;
    }
    createResultPayload(runnerStats, stateCounts) {
        const resltsUrl = SlackReporter.getResultsUrl();
        const counts = this.getCounts(stateCounts);
        const payload = {
            channel: this._channel,
            text: `${this._symbols.start} End of test${this._title && ' - ' + this._title}\n${counts}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${this._symbols.start} End of test - ${this._symbols.watch} ${runnerStats.duration / 1000}s`,
                        emoji: true,
                    },
                },
            ],
            attachments: [
                {
                    color: constants_1.FINISHED_COLOR,
                    text: `*Title*: \`${this._title}\`\n${resltsUrl ? `*Results*: <${resltsUrl}>\n` : ''}${counts}`,
                    ts: Date.now().toString(),
                },
            ],
        };
        return payload;
    }
    createResultDetailPayload(runnerStats, stateCounts) {
        const counts = this.getCounts(stateCounts);
        const payload = {
            channel: this._channel,
            text: `${this._title && this._title + '\n'}${counts}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: this._title || '',
                        emoji: true,
                    },
                },
                ...this.getResultDetailPayloads(),
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${counts}\n${this._symbols.watch} ${runnerStats.duration / 1000}s`,
                    },
                },
            ],
        };
        return payload;
    }
    getResultDetailPayloads() {
        const output = [];
        const suites = this.getOrderedSuites();
        const blocks = [];
        for (const suite of suites) {
            // Don't do anything if a suite has no tests or sub suites
            if (suite.tests.length === 0 &&
                suite.suites.length === 0 &&
                suite.hooks.length === 0) {
                continue;
            }
            // Get the indent/starting point for this suite
            const suiteIndent = this.indent(suite.uid);
            // Display the title of the suite
            if (suite.type) {
                output.push(`*${suiteIndent}${suite.title}*`);
            }
            // display suite description (Cucumber only)
            if (suite.description) {
                output.push(...suite.description
                    .trim()
                    .split('\n')
                    .map((l) => `${suiteIndent}${l.trim()}`));
            }
            const eventsToReport = this.getEventsToReport(suite);
            for (const test of eventsToReport) {
                const testTitle = test.title;
                const testState = test.state;
                const testIndent = `${constants_1.DEFAULT_INDENT}${suiteIndent}`;
                // Output for a single test
                output.push(`*${testIndent}${testState ? `${this._symbols[testState]} ` : ''}${testTitle}*`);
            }
            // Put a line break after each suite (only if tests exist in that suite)
            if (eventsToReport.length) {
                const block = {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: output.join('\n'),
                    },
                };
                output.length = 0;
                blocks.push(block);
            }
        }
        return blocks;
    }
    getOrderedSuites() {
        if (this._orderedSuites.length) {
            return this._orderedSuites;
        }
        this._orderedSuites = [];
        for (const uid of this._suiteUids) {
            for (const [suiteUid, suite] of Object.entries(this.suites)) {
                if (suiteUid !== uid) {
                    continue;
                }
                this._orderedSuites.push(suite);
            }
        }
        return this._orderedSuites;
    }
    /**
     * returns everything worth reporting from a suite
     * @param  {Object}    suite  test suite containing tests and hooks
     * @return {Object[]}         list of events to report
     */
    getEventsToReport(suite) {
        return [
            /**
             * report all tests and only hooks that failed
             */
            ...suite.hooksAndTests.filter((item) => {
                return item.type === 'test' || Boolean(item.error);
            }),
        ];
    }
    onRunnerStart(runnerStats) {
        if (this._notifyTestStartMessage) {
            try {
                if (this._client) {
                    log.info('INFO', `ON RUNNER START: POST MESSAGE`);
                    this._slackRequestQueue.push({
                        type: constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
                        payload: this.createStartPayload(runnerStats),
                    });
                }
                else if (this._webhook) {
                    log.info('INFO', `ON RUNNER START: SEND`);
                    this._slackRequestQueue.push({
                        type: constants_1.SLACK_REQUEST_TYPE.WEBHOOK_SEND,
                        payload: this.createStartPayload(runnerStats),
                    });
                }
            }
            catch (error) {
                log.error(error);
                throw error;
            }
        }
    }
    // onBeforeCommand(commandArgs: BeforeCommandArgs): void {}
    // onAfterCommand(commandArgs: AfterCommandArgs): void {}
    onSuiteStart(suiteStats) {
        this._currentSuite = suiteStats;
        this._suiteUids.add(suiteStats.uid);
        if (suiteStats.type === 'feature') {
            this._indents = 0;
            this._suiteIndents[suiteStats.uid] = this._indents;
        }
        else {
            this._suiteIndents[suiteStats.uid] = ++this._indents;
        }
    }
    // onHookStart(hookStat: HookStats): void {}
    onHookEnd(hookStats) {
        if (hookStats.error) {
            this._stateCounts.failed++;
            if (this._notifyFailedCase) {
                if (this._client) {
                    this._slackRequestQueue.push({
                        type: constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
                        payload: this.createFailedTestPayload(hookStats),
                    });
                }
                else {
                    this._slackRequestQueue.push({
                        type: constants_1.SLACK_REQUEST_TYPE.WEBHOOK_SEND,
                        payload: this.createFailedTestPayload(hookStats),
                    });
                }
            }
        }
    }
    // onTestStart(testStats: TestStats): void {}
    onTestPass(testStats) {
        this._stateCounts.passed++;
    }
    onTestFail(testStats) {
        this._stateCounts.failed++;
        if (this._notifyFailedCase) {
            if (this._client) {
                this._slackRequestQueue.push({
                    type: constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
                    payload: this.createFailedTestPayload(testStats),
                });
                if (this._uploadScreenshotOfFailedCase && this._lastScreenshotBuffer) {
                    log.error('UID', testStats.uid);
                    this._slackRequestQueue.push({
                        type: constants_1.SLACK_REQUEST_TYPE.WEB_API_UPLOAD,
                        payload: this.createScreenshotPayload(testStats, this._lastScreenshotBuffer),
                    });
                    this._lastScreenshotBuffer = undefined;
                }
            }
            else {
                this._slackRequestQueue.push({
                    type: constants_1.SLACK_REQUEST_TYPE.WEBHOOK_SEND,
                    payload: this.createFailedTestPayload(testStats),
                });
            }
        }
    }
    // onTestRetry(testStats: TestStats): void {}
    onTestSkip(testStats) {
        this._stateCounts.skipped++;
    }
    // onTestEnd(testStats: TestStats): void {}
    onSuiteEnd(suiteStats) {
        this._indents--;
    }
    onRunnerEnd(runnerStats) {
        if (this._client) {
            this._slackRequestQueue.push({
                type: constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
                payload: this.createResultPayload(runnerStats, this._stateCounts),
            });
            if (this._notifyDetailResultThread) {
                this._slackRequestQueue.push({
                    type: constants_1.SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
                    payload: this.createResultDetailPayload(runnerStats, this._stateCounts),
                    isDetailResult: true,
                });
            }
        }
        else {
            this._slackRequestQueue.push({
                type: constants_1.SLACK_REQUEST_TYPE.WEBHOOK_SEND,
                payload: this.createResultPayload(runnerStats, this._stateCounts),
            });
        }
        this._hasRunnerEnd = true;
    }
}
exports.default = SlackReporter;
__exportStar(require("./types"), exports);
