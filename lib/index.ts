import WDIOReporter from '@wdio/reporter'
import { 
  SlackAPI,
  SlackWebhook,
  ChatPostMessageArguments,
  IncomingWebhookSendArguments,
  WebAPICallResult,
  IncomingWebhookResult } from './utils';

declare namespace WebdriverIO {
	interface BrowserObject {
    takeScreenshot(): string | string[]
  }
}

declare var driver: WebdriverIO.BrowserObject;

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

interface StateCounts {
  passed: number;
  failed: number;
  skipped: number;
}

interface Hook extends WDIOReporter.Hook {
  error?: WDIOReporter.Error;
  errors?: WDIOReporter.Error[];
}

interface Test extends WDIOReporter.Test {
  uid?: string;
}

interface FailedMetaData {
  uid: string,
  title: string,
  errors: WDIOReporter.Error[],
  screenshot?: string[]
}

const SUCCESS_COLOR = '#36a64f';
const FAILED_COLOR = '#E51670';
const DEFAULT_COLOR = '#D3D3D3';
const SLACK_NAME = 'WebdriverIO Reporter';
const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';

export class SlackReporter extends WDIOReporter {
  private slackName: string;
  private slackIconUrl: string;
  private channel?: string;
  private api?: SlackAPI;
  private webhook?: SlackWebhook;
  private isWebhook: boolean;
  private attachFailureCase: boolean;
  private uploadScreenshotOfFailedCase: boolean;
  private notifyTestStartMessage: boolean;
  private resultsUrl: string;
  private isCompletedReport: boolean
  private stateCounts: StateCounts;
  private failedMetaData: FailedMetaData[];

  constructor (options: SlackReporterOptions) {
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
    options = Object.assign( { stdout: false }, options);
    super(options);

    this.slackName = options.slackName || SLACK_NAME;
    this.slackIconUrl = options.slackIconUrl || SLACK_ICON_URL;
    this.isWebhook = true;
    if (options.slackBotToken && options.channel) {
      this.api = new SlackAPI(options.slackBotToken);
      this.channel = options.channel;
      this.isWebhook = false;
    }
    else if (options.webhook) {
      this.webhook = new SlackWebhook(options.webhook, { username: this.slackName, icon_url: this.slackIconUrl })
    }
    this.attachFailureCase = options.attachFailedCase === undefined ? true : options.attachFailedCase;
    this.uploadScreenshotOfFailedCase = options.uploadScreenshotOfFailedCase === undefined ? false : options.uploadScreenshotOfFailedCase;
    this.notifyTestStartMessage = options.notifyTestStartMessage === undefined ? true : options.notifyTestStartMessage;
    this.resultsUrl = options.resultsUrl || '';
    this.stateCounts = {
      passed : 0,
      failed : 0,
      skipped : 0
    };
    this.failedMetaData = [];
    this.isCompletedReport = false;
  }

  get isSynchronised(): boolean {
    return this.isCompletedReport;
  }

  onRunnerStart(runner: any): void {
    if (this.notifyTestStartMessage) {
      const payload: IncomingWebhookSendArguments = {
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
  // onBeforeCommand() {}
  // onAfterCommand() {}
  // onScreenshot() {}
  // onSuiteStart() {}
  // onHookStart() {}
  onHookEnd(hook: Hook): void {
    if (hook.error) {
      this.stateCounts.failed++;
      if (this.attachFailureCase) {
        const title = `${hook.parent} > ${hook.title}`;
        const errors = hook.errors || [hook.error]

        const metaData: FailedMetaData = {
          uid: hook.uid,
          title,
          errors,
        }
        
        this.failedMetaData.push(metaData)
      }
    }
  }
  // onTestStart() {}
  onTestPass(): void {
    this.stateCounts.passed++;
  }
  async onTestFail(test: Test): Promise<void> {
    this.stateCounts.failed++;

    if (this.attachFailureCase) {
      const title = test.title || test.fullTitle;
      const errors = test.errors || [test.error!];
      const metaData: FailedMetaData = {
        uid: test.uid!,
        title,
        errors,
      }
      if (!this.isWebhook && this.uploadScreenshotOfFailedCase) {
        try {
          const results = await driver.takeScreenshot();
          metaData.screenshot = [];
          if (Array.isArray(results)) {
            for (const result of results) {
              metaData.screenshot.push(result)
            }
          }
          else {
            metaData.screenshot.push(results)
          }
        }
        catch (error) {
          throw error;
        }
      }
      this.failedMetaData.push(metaData)
    }
  }
  onTestSkip(): void {
    this.stateCounts.skipped++;
  }
  // onTestEnd() {}
  // onSuiteEnd() {}
  async onRunnerEnd(runner: any): Promise<void> {
    try {
      await this.sendResultMessage(runner);
      await this.sendFailedTestMessage();
    }
    catch (error) {
      throw error;
    }
    finally {
      this.isCompletedReport = true;
    }
  }

  async sendMessage(payload: IncomingWebhookSendArguments): Promise<IncomingWebhookResult | WebAPICallResult> {
    try {
      if (this.isWebhook) {
        return await this.webhook!.send(payload);
      }
      else {
        const options: ChatPostMessageArguments = {
          channel: this.channel!,
          text: '',
          ...payload
        }
        return await this.api!.sendMessage(options);
      }
    }
    catch (error) {
      throw error;
    }
  }
  
  async sendResultMessage(runner: any): Promise<void> {
    const result = `*Passed: ${this.stateCounts.passed} | Failed: ${this.stateCounts.failed} | Skipped: ${this.stateCounts.skipped}*`;
    const payload: IncomingWebhookSendArguments = {
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
          text: `${!this.notifyTestStartMessage ? this.setEnvironment(runner) + '\n' : '' }${result}${this.resultsUrl ? ('\n*Results:* ' + this.resultsUrl) : ''}`,
          ts: Date.now().toString()
        }
      ]
    }

    await this.sendMessage(payload);
  }

  async sendFailedTestMessage(): Promise<void> {
    if (this.failedMetaData.length > 0) {
      try {
        for (const data of this.failedMetaData) {
          const errorMessage = data.errors.reduce((acc, cur) => {
            return acc + '```' + this.convertErrorStack(cur.stack)+ '```'
          }, '')
      
          const payload: IncomingWebhookSendArguments = {
            attachments: [
              {
                color: FAILED_COLOR,
                title: data.title,
                text: errorMessage
              }
            ]
          };
  
          const result = await this.sendMessage(payload);
          if (!this.isWebhook && data.screenshot && data.screenshot.length > 0) {
            for (const screenshot of data.screenshot) {
              const buffer = Buffer.from(screenshot, 'base64');
              await this.api?.uploadScreenshot({ file: buffer, thread_ts: (result as any).ts, channels: this.channel });
            }
          }
        }
      }
      catch (error) {
        throw error;
      }
      
    }
  }

  convertErrorStack(stack: string): string {
    return stack.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
  }

  setEnvironment(runner: any): string {
    let capabilities: any[] = [];
    let driverName: string[] = [];
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
      })
    }

    capabilities.forEach((capability, index) => {
      app = (capability.app || '').replace('sauce-storage:', '').split('/')
      program = app[app.length - 1] || capability.browserName;
      programVersion = capability.version || capability.browserVersion
      platform = capability.platformName || capability.platform || (capability.os ? capability.os + (capability.os_version ?  ` ${capability.os_version}` : '') : '(unknown)')
      platformVersion = capability.platformVersion || '';
      deviceName = capability.deviceName || '';

      env += (runner.isMultiremote ? `- *${driverName[index]}*: ` : '*Driver*: ') + program + (programVersion ? ` (v${programVersion}) ` : ' ') + `on ` + (deviceName ? `${deviceName} ` : '') + `${platform}` + (platformVersion ? ` (v${platformVersion})` : '') + (index === 0 ? '\n' : '')
    })
      
    return env;
  }
}

module.exports = SlackReporter