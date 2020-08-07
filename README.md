@moroo/wdio-slack-reporter
========================
Reporter from [WebdriverIO](https://webdriver.io/) using [Incoming webhook](https://api.slack.com/incoming-webhooks) and [Web API](https://api.slack.com/web) to send results to [Slack](https://slack.com/).<br>
This project is Compatible with [WebdriverIO](https://webdriver.io/) version 6.

## Slack notification screenshot
> *Case #1*: All Passed\
> *Case #2*: MultiRemote & Have Failure

<img src="https://raw.githubusercontent.com/morooLee/wdio-slack-reporter/master/docs/Notification.png" width="80%" height="80%" title="Notification Image" alt="Notification"></img>

## WebdriverIO 4.x or lower Compatibility
> If you are using 4.x or lower, use to [wdio-slack-reporter](https://github.com/kmnaid/wdio-slack-reporter).   
> That project has not been updated and doesnt work with the latest webdriverio 5.x or 6.x.

## Installation
The easiest way is to keep `@moroo/wdio-slack-reporter` as a devDependency in your `package.json`.

```json
{
  "devDependencies": {
    "@moroo/wdio-slack-reporter": "1.0.3"
  }
}
```
You can simple do it by:   
* NPM
```bash
npm install @moroo/wdio-slack-reporter --save-dev
```
* Yarn
```bash
yarn add @moroo/wdio-slack-reporter --dev
```

Instructions on how to install `WebdriverIO` can be found [here](https://webdriver.io/docs/gettingstarted.html).

## Configuration
At the top of the wdio.conf.js-file, add:
 
```js
// wdio.conf.js
const slack = require("@moroo/wdio-slack-reporter");
```

In order to use the reporter you need to add slack to your reporters array in wdio.conf.js

```js
// wdio.conf.js
export.config = {
  reporters: [
    [slack, {
      webhook: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/........", 
    }],
  ],
};
```
## Configuration Options

The following configuration options are supported.<br>
For notifications to be sent, You must set `webhook` or `web-api`.<br>
If both `web-api` and `webhook` are set, `web-api` is used.

| Group | Option | Required | Description |
|-------|--------|----------|-------------|
|**webhook**|webhook|`required`|**type**: `string`<br>**scope**: `webhook`<br>[**Incoming webhook**](https://api.slack.com/incoming-webhooks) of the slack channel to which notifications should be sent. If the URL is not configured, notifications will not be sent.|
||slackName||**type**: `string`<br>**scope**: `webhook`<br>**default**: `"WebdriverIO Reporter"`<br>The value of username will appear in the slack notification as the user who sent it.|
||slackIconUrl||**type**: `string`<br>**scope**: `webhook`<br>**default**: `"https://webdriver.io/img/webdriverio.png"`<br>The url of the Icon to be displayed in the slack|
|**web-api**|slackBotToken|`required`|**type**: `string`<br>**scope**: `web-api`<br>[**Web API**](https://api.slack.com/web) of the slack channel to which notifications should be sent. [A bot user token](https://api.slack.com/legacy/oauth#bots) is required. Bot access tokens always begin with `xoxb`.<br>The bot token requires the OAuth scope of [`chat:write`](https://api.slack.com/scopes/chat:write), [`files:write`](https://api.slack.com/scopes/files:write).<br>[See below](https://api.slack.com/methods/chat.postMessage#text_usage) for more details.|
||channel|`required`|**type**: `string`<br>**scope**: `web-api`<br>Channel, private group, or IM channel to send message to. Can be an encoded ID, or a name. [See below](https://api.slack.com/legacy/oauth-scopes) for more details.<br>_[`"How to find channel ID" - stackoverflow -`](https://stackoverflow.com/questions/57139545/how-can-i-see-slack-bot-info-like-user-id-and-bot-id-without-making-api-call)_|
||uploadScreenshotOfFailedCase||**type**: `boolean`<br>**scope**: `web-api`<br>**default**: `false`<br>Set this option to true to attach a screenshot to the failed case.|
|**common**|notifyTestStartMessage||**type**: `boolean`<br>**scope**: `webhook`, `web-api`<br>**default**: `true`<br>Set this option to true to send notifications test start.|
||attachFailedCase||**type**: `boolean`<br>**scope**: `webhook`, `web-api`<br>**default**: `true`<br>Set this option to true to attach failed cases in the test results reported to Slack.|
||resultsUrl||**type**: `string`<br>**scope**: `webhook`, `web-api`<br>Provide a link to the test results. It is a clickable link in the notification.

## Use the Incoming Webhook
If you are using webhook, these options are not available.
> **slackBotToken**: process.env.SLACK_BOT_TOKEN || "xoxb-xxxxxxxxxx-xxxxxx..."<br>
> **channel**: process.env.SLACK_CHANNEL || "Cxxxxxxxxxx"<br>
> **uploadScreenshotOfFailedCase**: true<br>
```js
// wdio.conf.js
export.config = {
  reporters: [
    [slack, {
      /**
       * [Incoming Webhook]
       * If you are using webhook, these options are not available.
       * @param {string} slackBotToken: process.env.SLACK_BOT_TOKEN || "xoxb-xxxxxxxxxx-xxxxxx...",
       * @param {string} channel: process.env.SLACK_CHANNEL || "Cxxxxxxxxxx",
       * @param {boolean} uploadScreenshotOfFailedCase: true,
       */
      webhook: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/........",
      slackName: "WebdriverIO Reporter",
      slackIconUrl: "https://webdriver.io/img/webdriverio.png",
      attachFailedCase: true,
      notifyTestStartMessage: true,
      resultsUrl: process.env.JENKINS_URL,
    }],
  ],
};
```
## Use the Web API
To use the api, you need a scopes like the one below.<br>
[`chat:write`](https://api.slack.com/scopes/chat:write), [`files:write`](https://api.slack.com/scopes/files:write). [See below](https://api.slack.com/legacy/oauth-scopes) for more details.<br>
If you are using web-api, these options are not available.
> **webhook**: process.env.SLACK_WEBHOOK_URL || "https&#8203;://hooks.slack.com/........"<br>
> **slackName**: "WebdriverIO Reporter"<br>
> **slackIconUrl**: "https&#8203;://webdriver.io/img/webdriverio.png"<br>
```js
//wdio.conf.js
export.config = {
  reporters: [
    [slack, {
      /**
       * [Web API]
       * If you are using web-api, these options are not available.
       * @param {string} webhook: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/........",
       * @param {string} slackName: "WebdriverIO Reporter",
       * @param {string} slackIconUrl: "https://webdriver.io/img/webdriverio.png",
       */
      slackBotToken: process.env.SLACK_BOT_TOKEN || "xoxb-xxxxxxxxxx-xxxxxx...",
      channel: process.env.SLACK_CHANNEL || "Cxxxxxxxxxx",
      attachFailedCase: true,
      notifyTestStartMessage: true,
      uploadScreenshotOfFailedCase: true,
      resultsUrl: process.env.JENKINS_URL,
    }],
  ],
};
```
## Set all options
If you set both `webhook` and `web-api`, `web-api` is used.
```js
//wdio.conf.js
export.config = {
  reporters: [
    [slack, {
      // If you set both webhook and web-api, web-api is used.
      webhook: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/........",
      slackName: "WebdriverIO Reporter",
      slackIconUrl: "https://webdriver.io/img/webdriverio.png",
      slackBotToken: process.env.SLACK_BOT_TOKEN || "xoxb-xxxxxxxxxx-xxxxxx...",
      channel: process.env.SLACK_CHANNEL || "Cxxxxxxxxxx",
      attachFailedCase: true,
      notifyTestStartMessage: true,
      uploadScreenshotOfFailedCase: true,
      resultsUrl: process.env.JENKINS_URL,
    }],
  ],
};
```
## Issues
### Unsynced
If the following error occurs, set `reporterSyncInterval` in `wdio.conf.js`.
> **`ERROR @wdio/runner: Error: Some reporters are still unsynced: SlackReporter`**
```js
//wdio.conf.js
export.config = {
  reporterSyncInterval: 20000,
}
```
### Promise\<pending\>
If the following error occurs, set the interval between tests using the `hook`.
> **`$(...).click is not a function`**
```js
//wdio.conf.js
export.config = {
  beforeHook: function (test, context) {
    driver.pause(500);
  },
}
```
