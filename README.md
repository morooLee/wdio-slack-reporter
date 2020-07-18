@moroo/wdio-slack-reporter
========================
A reporter for [WebdriverIO](https://webdriver.io/) which send result to [Slack](https://slack.com/).   
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
    "@moroo/wdio-slack-service": "0.1.2"
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
const slack = require('@moroo/wdio-slack-reporter');
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

The following configuration options are supported and are all optional. By default none of the config options are set.
For notifications to be sent `webhook` option should atleast be set.

| Option  | Description |
|---------|-------------|
|webhook|String - [Incoming webhook](https://api.slack.com/incoming-webhooks) of the slack channel to which notifications should be sent. If the URL is not configured, notifications will not be sent.|
|slackName|String - (Default: 'WebdriverIO Reporter')<br>The value of username will appear in the slack notification as the user who sent it.|
|slackIconUrl|String - (Default: 'https://webdriver.io/img/webdriverio.png')<br>The url of the Icon to be displayed in the slack|
|notifyTestStartMessage|Boolean - (Default: true)<br>Set this option to true to send notifications test start and driver capabilities.|
|attachFailureCase|Boolean - (Default: true)<br>Set this option to true to attach failure cases in the test results reported to Slack.|
|resultsUrl|URL - Provide a link to the test results. It is a clickable link in the notification.
```js
// wdio.conf.js
export.config = {
  reporters: [
    [slack, {
      webhook: process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/........",  
      slackName: 'WebdriverIO Reporter',
      slackIconUrl: 'https://webdriver.io/img/webdriverio.png',
      attachFailureCase: true,
      notifyTestStartMessage: true,
      resultsUrl: process.env.JENKINS_URL,
    }],
  ],
};
```
