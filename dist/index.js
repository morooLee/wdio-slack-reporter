"use strict";
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
exports.SlackReporter = void 0;
const reporter_1 = __importDefault(require("@wdio/reporter"));
const utils_1 = require("./utils");
const SUCCESS_COLOR = '#36a64f';
const FAILED_COLOR = '#E51670';
const DEFAULT_COLOR = '#D3D3D3';
const SLACK_NAME = 'WebdriverIO Reporter';
const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';
class SlackReporter extends reporter_1.default {
    constructor(options) {
        if (!options.webhook && !options.slackBotToken) {
            const errorMessage = 'Slack Webhook URL or Slack Bot Token is not configured, notifications will not be sent to slack.';
            console.error(`[wdio-slack-reporter] ${errorMessage}`);
            throw new Error(errorMessage);
        }
        else if (options.slackBotToken && !options.channel) {
            const errorMessage = 'Channel is not configured, Configure the channel to use the Slack API.';
            console.error(`[wdio-slack-reporter] ${errorMessage}`);
            throw new Error(errorMessage);
        }
        else if (options.uploadScreenshotOfFailedCase && options.webhook && !options.slackBotToken) {
            const errorMessage = 'The uploadScreenshotOfFailedCase option is only available if web-api is set.';
            console.warn(`[wdio-slack-reporter] ${errorMessage}`);
        }
        options = Object.assign({ stdout: false }, options);
        super(options);
        this.slackName = options.slackName || SLACK_NAME;
        this.slackIconUrl = options.slackIconUrl || SLACK_ICON_URL;
        this.isWebhook = true;
        if (options.slackBotToken && options.channel) {
            this.api = new utils_1.SlackAPI(options.slackBotToken);
            this.channel = options.channel;
            this.isWebhook = false;
        }
        else if (options.webhook) {
            this.webhook = new utils_1.SlackWebhook(options.webhook, { username: this.slackName, icon_url: this.slackIconUrl });
        }
        this.attachFailedCase = options.attachFailedCase === undefined ? true : options.attachFailedCase;
        this.uploadScreenshotOfFailedCase = options.uploadScreenshotOfFailedCase === undefined ? false : options.uploadScreenshotOfFailedCase;
        this.notifyTestStartMessage = options.notifyTestStartMessage === undefined ? true : options.notifyTestStartMessage;
        this.resultsUrl = options.resultsUrl || '';
        this.stateCounts = {
            passed: 0,
            failed: 0,
            skipped: 0
        };
        this.failedMetaData = [];
        this.isCompletedReport = false;
    }
    get isSynchronised() {
        return this.isCompletedReport;
    }
    onRunnerStart(runner) {
        if (this.notifyTestStartMessage) {
            const payload = {
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:rocket: *Starting WebdriverIO*`,
                        },
                    },
                ],
                attachments: [
                    {
                        color: DEFAULT_COLOR,
                        text: this.setEnvironment(runner),
                        ts: Date.now().toString()
                    },
                ]
            };
            this.sendMessage(payload);
        }
    }
    onHookEnd(hook) {
        if (hook.error) {
            this.stateCounts.failed++;
            if (this.attachFailedCase) {
                const title = `${hook.parent} > ${hook.title}`;
                const errors = hook.errors || [hook.error];
                const metaData = {
                    uid: hook.uid,
                    title,
                    errors,
                };
                this.failedMetaData.push(metaData);
            }
        }
    }
    onTestPass() {
        this.stateCounts.passed++;
    }
    onTestFail(test) {
        return __awaiter(this, void 0, void 0, function* () {
            this.stateCounts.failed++;
            if (this.attachFailedCase) {
                const title = test.title || test.fullTitle;
                const errors = test.errors || [test.error];
                const metaData = {
                    uid: test.uid,
                    title,
                    errors,
                };
                if (!this.isWebhook && this.uploadScreenshotOfFailedCase) {
                    try {
                        const results = yield driver.takeScreenshot();
                        metaData.screenshot = [];
                        if (Array.isArray(results)) {
                            for (const result of results) {
                                metaData.screenshot.push(result);
                            }
                        }
                        else {
                            metaData.screenshot.push(results);
                        }
                    }
                    catch (error) {
                        throw error;
                    }
                }
                this.failedMetaData.push(metaData);
            }
        });
    }
    onTestSkip() {
        this.stateCounts.skipped++;
    }
    onRunnerEnd(runner) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.sendResultMessage(runner);
                yield this.sendFailedTestMessage();
            }
            catch (error) {
                throw error;
            }
            finally {
                this.isCompletedReport = true;
            }
        });
    }
    sendMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isWebhook) {
                    return yield this.webhook.send(payload);
                }
                else {
                    const options = Object.assign({ channel: this.channel, text: '' }, payload);
                    return yield this.api.sendMessage(options);
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    sendResultMessage(runner) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = `*Passed: ${this.stateCounts.passed} | Failed: ${this.stateCounts.failed} | Skipped: ${this.stateCounts.skipped}*`;
            const payload = {
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:checkered_flag: *Test Completed* - :stopwatch:${runner.duration / 1000}s`
                        }
                    }
                ],
                attachments: [
                    {
                        color: `${this.stateCounts.failed ? FAILED_COLOR : SUCCESS_COLOR}`,
                        text: `${!this.notifyTestStartMessage ? this.setEnvironment(runner) + '\n' : ''}${result}${this.resultsUrl ? ('\n*Results:* ' + this.resultsUrl) : ''}`,
                        ts: Date.now().toString()
                    }
                ]
            };
            yield this.sendMessage(payload);
        });
    }
    sendFailedTestMessage() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.failedMetaData.length > 0) {
                try {
                    for (const data of this.failedMetaData) {
                        const errorMessage = data.errors.reduce((acc, cur) => {
                            return acc + '```' + this.convertErrorStack(cur.stack) + '```';
                        }, '');
                        const payload = {
                            attachments: [
                                {
                                    color: FAILED_COLOR,
                                    title: data.title,
                                    text: errorMessage
                                }
                            ]
                        };
                        const result = yield this.sendMessage(payload);
                        if (!this.isWebhook && data.screenshot && data.screenshot.length > 0) {
                            for (const screenshot of data.screenshot) {
                                const buffer = Buffer.from(screenshot, 'base64');
                                yield ((_a = this.api) === null || _a === void 0 ? void 0 : _a.uploadScreenshot({ file: buffer, thread_ts: result.ts, channels: this.channel }));
                            }
                        }
                    }
                }
                catch (error) {
                    throw error;
                }
            }
        });
    }
    convertErrorStack(stack) {
        return stack.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
    }
    setEnvironment(runner) {
        let capabilities = [];
        let driverName = [];
        let app = '';
        let program = '';
        let programVersion = '';
        let platform = '';
        let platformVersion = '';
        let deviceName = '';
        let env = '';
        if (!runner.isMultiremote) {
            capabilities.push(runner.capabilities);
        }
        else {
            env += '*MultiRemote*\n';
            Object.keys(runner.capabilities).forEach((key) => {
                driverName.push(key);
                capabilities.push(runner.capabilities[key]);
            });
        }
        capabilities.forEach((capability, index) => {
            app = (capability.app || '').replace('sauce-storage:', '').split('/');
            program = app[app.length - 1] || capability.browserName;
            programVersion = capability.version || capability.browserVersion;
            platform = capability.platformName || capability.platform || (capability.os ? capability.os + (capability.os_version ? ` ${capability.os_version}` : '') : '(unknown)');
            platformVersion = capability.platformVersion || '';
            deviceName = capability.deviceName || '';
            env += (runner.isMultiremote ? `- *${driverName[index]}*: ` : '*Driver*: ') + program + (programVersion ? ` (v${programVersion}) ` : ' ') + `on ` + (deviceName ? `${deviceName} ` : '') + `${platform}` + (platformVersion ? ` (v${platformVersion})` : '') + (index === 0 ? '\n' : '');
        });
        return env;
    }
}
exports.SlackReporter = SlackReporter;
module.exports = SlackReporter;
//# sourceMappingURL=index.js.map