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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackWebhook = exports.SlackAPI = void 0;
const web_api_1 = require("@slack/web-api");
const webhook_1 = require("@slack/webhook");
class SlackAPI {
    constructor(token) {
        this.api = new web_api_1.WebClient(token);
    }
    uploadScreenshot(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const uploadRes = yield this.api.files.upload(options);
                if (uploadRes.ok) {
                    return uploadRes;
                }
                else {
                    throw uploadRes.error;
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    sendMessage(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.api.chat.postMessage(options);
                if (result.ok) {
                    return result;
                }
                else {
                    throw result.error;
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.SlackAPI = SlackAPI;
class SlackWebhook {
    constructor(webhook, defaults) {
        this.webhook = new webhook_1.IncomingWebhook(webhook, defaults);
    }
    send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.webhook.send(payload);
                if (result.text === 'ok') {
                    return result;
                }
                else {
                    throw result;
                }
            }
            catch (error) {
                throw (error);
            }
        });
    }
}
exports.SlackWebhook = SlackWebhook;
//# sourceMappingURL=utils.js.map