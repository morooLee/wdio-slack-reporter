const { IncomingWebhook } = require('@slack/webhook')

/**
 * transform cucumber table to format suitable for `easy-table`
 * @param   {object[]} rows cucumber table rows
 * @returns {object[]}
 */
export const sendMessage = () => {

}

/**
 * transform cucumber table to format suitable for `easy-table`
 * @param   {any} runner cucumber table rows
 * @returns {any}
 */
export const createMessageContent = (runner) => {
    
}

const SLACK_NAME = 'WebdriverIO Reporter';
const SLACK_ICON_URL = 'https://webdriver.io/img/webdriverio.png';

export class SlackWebhook {
    constructor(options) {
        this.slackName = options.slackName || SLACK_NAME,
		this.slackIconUrl = options.slackIconUrl || SLACK_ICON_URL,
		this.webhook = new IncomingWebhook(options.webhook, { username: this.slackName, icon_url: this.slackIconUrl });
    }

    async send(payload) {
        return await this.webhook.send(payload)
    }
}