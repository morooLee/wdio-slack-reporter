export const SLACK_NAME = 'WebdriverIO Reporter';
export const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';
export const SUCCESS_COLOR = '#36a64f';
export const FAILED_COLOR = '#dc3545';
export const DEFAULT_COLOR = '#D3D3D3';
export const FINISHED_COLOR = '#4366c7';
export const DEFAULT_INDENT = '\t';
export const EMOJI_SYMBOLS = {
  PASSED: ':white_check_mark:',
  SKIPPED: ':double_vertical_bar:',
  PENDING: ':grey_question:',
  FAILED: ':x:',
  ROKET: ':rocket:',
  CHECKERED_FLAG: ':checkered_flag:',
  STOPWATCH: ':stopwatch:',
} as const;

export const SLACK_REQUEST_TYPE = {
  WEB_API_POST_MESSAGE: 'web-api:message',
  WEB_API_UPLOAD: 'web-api:upload',
  WEBHOOK_SEND: 'webhook:send',
} as const;

export const EVENTS = {
  POST_MESSAGE: 'slackReporter:postMessage',
  UPLOAD: 'slackReporter:upload',
  SEND: 'slackReporter:send',
  RESULT: 'slackReporter:result',
  SCREENSHOT: 'slackReporter:screenshot',
} as const;

export const ERROR_MESSAGES = {
  UNDEFINED_SLACK_OPTION:
    'Slack Option is undefined. Please Check Slack Option.',
  NOT_USING_WEBHOOK: 'Not using webhook.',
  NOT_USING_WEB_API: 'Not using web-api.',
  DISABLED_OPTIONS:
    'Disabled notifyFailedCase or uploadScreenshotOfFailedCase options.',
} as const;
