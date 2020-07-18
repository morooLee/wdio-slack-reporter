"use strict";
const reporter_1 = require("@wdio/reporter");
const webhook_1 = require("@slack/webhook");
const SUCCESS_COLOR = '#36a64f';
const FAILED_COLOR = '#E51670';
const DEFAULT_COLOR = '#D3D3D3';
const SLACK_NAME = 'WebdriverIO Reporter';
const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';
class SlackReporter extends reporter_1.default {
    constructor(options) {
        if (!options.webhook) {
            const errorMessage = 'Slack Webhook URL is not configured, notifications will not be sent to slack.';
            console.error(`[wdio-slack-reporter] ${errorMessage}`);
            throw new Error(errorMessage);
        }
        ;
        options = Object.assign({ stdout: true }, options);
        super(options);
        this.slackName = options.slackName || SLACK_NAME;
        this.slackIconUrl = options.slackIconUrl || SLACK_ICON_URL;
        this.webhook = new webhook_1.IncomingWebhook(options.webhook, { username: this.slackName, icon_url: this.slackIconUrl });
        this.attachFailureCase = options.attachFailureCase || true;
        this.notifyTestStartMessage = options.notifyTestStartMessage || true;
        this.resultsUrl = options.resultsUrl || '';
        this.failureAttachments = [];
        this.unsynced = [];
        this.stateCounts = {
            passed: 0,
            failed: 0,
            skipped: 0
        };
    }
    get isSynchronised() {
        return this.unsynced.length === 0;
    }
    onRunnerStart(runner) {
        if (this.notifyTestStartMessage) {
            const payload = {
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:rocket: *Starting Test*`,
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
    onBeforeCommand() { }
    onAfterCommand() { }
    onScreenshot() { }
    onSuiteStart() { }
    onHookStart() { }
    onHookEnd(hook) {
        if (hook.error) {
            this.stateCounts.failed++;
            if (this.attachFailureCase) {
                const title = `${hook.parent} > ${hook.title}`;
                this.addFailureAttachments(title, [hook.error]);
            }
        }
    }
    onTestStart() { }
    onTestPass() {
        this.stateCounts.passed++;
    }
    onTestFail(test) {
        this.stateCounts.failed++;
        if (this.attachFailureCase) {
            const title = test.title || test.fullTitle;
            const errors = test.errors || [test.error];
            this.addFailureAttachments(title, errors);
        }
    }
    onTestSkip() {
        this.stateCounts.skipped++;
    }
    onTestEnd() { }
    onSuiteEnd() { }
    onRunnerEnd(runner) {
        const payload = this.createPayloadResult(runner);
        this.sendMessage(payload);
    }
    sendMessage(payload) {
        this.unsynced.push(payload);
        this.webhook.send(payload)
            .catch((error) => {
            throw error;
        }).finally(() => {
            this.unsynced.splice(0, 1);
        });
    }
    createPayloadResult(runner) {
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
                    text: `${result}${this.resultsUrl ? ('\n*Results:* ' + this.resultsUrl) : ''}`,
                    ts: Date.now().toString()
                }
            ]
        };
        if (this.failureAttachments.length > 0) {
            const dividerBlock = { blocks: [{ type: "divider" }] };
            payload.attachments.push(dividerBlock);
            this.failureAttachments.forEach((attach) => {
                payload.attachments.push(attach);
            });
        }
        ;
        return payload;
    }
    addFailureAttachments(title, errors) {
        const errorMessage = errors.reduce((acc, cur) => {
            return acc + '```' + cur + '```';
        }, '');
        const attach = {
            color: FAILED_COLOR,
            title,
            text: errorMessage
        };
        this.failureAttachments.push(attach);
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
            env += (runner.isMultiremote ? `*${driverName[index]}:* ` : '') + program + (programVersion ? ` (v${programVersion}) ` : ' ') + `on ` + (deviceName ? `${deviceName} ` : '') + `${platform}` + (platformVersion ? ` (v${platformVersion})` : '') + (index === 0 ? '\n' : '');
        });
        return env;
    }
}
module.exports = SlackReporter;
