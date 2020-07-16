import WDIOReporter from '@wdio/reporter';
import Logger from '@wdio/logger';
import { IncomingWebhook } from '@slack/webhook';

const log = Logger('wdio-slack-reporter');
const SUCCESS_COLOR = '#36a64f';
const FAILED_COLOR = '#E51670';
const SLACK_NAME = 'WebdriverIO Reporter';
const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';
const NO_WEBHOOK_ERROR_LOG = 'Slack Webhook URL is not configured, notifications will not be sent to slack.';
const RUNNER_START_INFO_LOG = 'Send a message to the slack indicating the test start.';
const RUNNER_END_INFO_LOG = 'Send a message to the slack indicating the test result.';
const ERROR_STACK_REPLACE_VALUE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

class SlackReporter extends WDIOReporter {
    constructor (options) {
        if (!options.webhook) {
            console.error(`[@wdio/slack-reporter] ${NO_WEBHOOK_ERROR_LOG}`);
            log.error(NO_WEBHOOK_ERROR_LOG);
			throw new Error(NO_WEBHOOK_ERROR_LOG);
        };

        options = Object.assign({ stdout: true }, options);
        super(options);

		this.slackName = options.slackName || SLACK_NAME,
		this.slackIconUrl = options.slackIconUrl || SLACK_ICON_URL,
		this.webhook = new IncomingWebhook(options.webhook, { username: this.slackName, icon_url: this.slackIconUrl });
		this.attachFailureCase = options.notifyFailureCase || true;
        this.notifyTestStartMessage = options.notifyTestStartMessage || true;
        this.resultsUrl = options.resultsUrl ||'';
        this.unsynced = [];
        this.stateCounts = {
            passed : 0,
            failed : 0,
            skipped : 0
        };
    }

    get isSynchronised() {
        return this.unsynced.length === 0
    }

    onRunnerStart(runner) {
        log.info(RUNNER_START_INFO_LOG);
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
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: this.setEnvironment(runner),
						},
					},
				],
            };
            this.sendMessage(payload);
        }
    }
    onBeforeCommand() {}
    onAfterCommand() {}
    onScreenshot() {}
    onSuiteStart() {}
    onHookStart() {}
    onHookEnd(hook) {
        if (hook.error) {
            this.stateCounts.failed++;
            if (this.attachFailureCase) {
                this.createPayloadAttachFailureCase(hook);
            }
        }
    }
    onTestStart() {}
    onTestPass() {
        this.stateCounts.passed++;
    }
    onTestFail(test) {
        this.stateCounts.failed++;
        if (this.attachFailureCase) {
            this.createPayloadAttachFailureCase(test);
        }
    }
    onTestSkip() {
        this.stateCounts.skipped++;
    }
    onTestEnd() {}
    onSuiteEnd() {}
    onRunnerEnd(runner) {
        log.info(RUNNER_END_INFO_LOG);
        const payload = createPayloadResult(runner);
        this.sendMessage(payload);
    }

    sendMessage(payload) {
        this.unsynced.push(payload);
        log.info(`DATA ${JSON.stringify(payload)}`);
        this.webhook.send(payload)
        .then((result) => {
            log.info(`RESULT ${JSON.stringify(result)}`);
        }).catch((error) => {
            log.error(error);
            throw error;
        }).finally(() => {
            this.unsynced.splice(0, 1);
        });
    }
    
    createPayloadResult(runner) {
        const result = `*Passed: ${this.stateCounts.passed} | Failed: ${this.stateCounts.failed} | Skipped: ${this.stateCounts.skipped}*`;
		const payload = {
			attachments: [
				{
                    color: `${this.stateCounts.failed ? FAILED_COLOR : SUCCESS_COLOR}`,
					text: `:checkered_flag: *Test Completed* (:stopwatch:*${runner.duration / 1000}s)\n${result}${this.resultsUrl ? ('\n*Results:* ' + this.resultsUrl) : ''}`
				}
			]
		}

		if (this.failureAttachments.length > 0) {
            payload.attachments.push({ blocks: [{ type: "divider" }] });
            this.failureAttachments.forEach((attach) => {
                payload.attachments.push(attach)
            });
		};

		return payload;
    }

    createPayloadAttachFailureCase(failureCase) {
		const errorMessage = failureCase.error.stack.replace(ERROR_STACK_REPLACE_VALUE, "");
        const title = failureCase.parent ? `${failureCase.parent} > ${failureCase.title}` : (failureCase.title || failureCase.fullTitle);
        const attach = {
			color: FAILED_COLOR,
			title,
			text: `\`\`\`${errorMessage}\`\`\``,
		};

		this.failureAttachments.push(attach);
    }

    setEnvironment(runner) {
		let capabilities = [];
		let driverName = [];
		let app = '';;
		let program = '';;
		let programVersion = '';;
		let platform = '';;
		let platformVersion = '';;
		let deviceName = '';;
		let env = '';
		
		if (!runner.isMultiremote) {
			capabilities.push(runner.capabilities);
		}
		else {
			env += '> *MultiRemote*\n';

			Object.keys(runner.capabilities).forEach((key) => {
				driverName.push(key)
				capabilities.push(runner.capabilities[key]);
			})
		}
		capabilities.forEach((capability, index) => {
			app = (capability.app || '').replace('sauce-storage:', '').split('/')
			program = app[app.length - 1] || capability.browserName;
			programVersion = capability.version || capability.browserVersion
			platform = capability.platformName || capability.platform || (capability.os ? capability.os + (capability.os_version ?  ` ${capability.os_version}` : '') : '(unknown)')
			platformVersion = capability.platformVersion || '';
			deviceName = capability.deviceName || '';

			env += '> ' + (runner.isMultiremote ? `*${driverName[index]}:* ` : '') + program + (programVersion ? ` (v${programVersion}) ` : ' ') + `on ` + (deviceName ? `${deviceName} ` : '') + `${platform}` + (platformVersion ? ` (v${platformVersion})` : '') + (index === 0 ? '\n' : '')
		})

		return env;
	}
}

export default SlackReporter;