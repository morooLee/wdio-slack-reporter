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
exports.uploadScreenshot = void 0;
const web_api_1 = require("@slack/web-api");
const moment = require("moment");
const bolt_1 = require("@slack/bolt");
class SlackAPI {
    constructor(token, signingSecret) {
        this.client = new web_api_1.WebClient(token);
        this.app = new bolt_1.App({ token, signingSecret });
    }
    uploadScreenshot(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const uploadRes = yield this.app.client.files.upload({ file: buffer });
                if (uploadRes.ok) {
                    const sharedPublicURLRes = yield this.app.client.files.sharedPublicURL({
                        file: uploadRes.file.id,
                    });
                    if (sharedPublicURLRes.ok) {
                        const parsedPermalink = sharedPublicURLRes.file.permalink_public.split('-');
                        const pubSecret = parsedPermalink[parsedPermalink.length - 1];
                        return sharedPublicURLRes.file.url_private + `?pub_secret=${pubSecret}`;
                    }
                    else {
                        throw sharedPublicURLRes.error;
                    }
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
}
exports.default = SlackAPI;
exports.uploadScreenshot = (token, buffer) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new web_api_1.WebClient(token);
    const timestamp = moment().format('YYYYMMDD-HHmmss.SSS');
    const filename = timestamp + '.png';
    try {
        const result = client.files.upload({
            filename,
            file: buffer,
            filetype: filename.split('.')[1] || 'png'
        }).then((result) => {
            return result;
        }).catch((error) => {
            throw error;
        });
        return result;
    }
    catch (error) {
        throw error;
    }
});
