const SlackReporter = require('../dist');

describe('SlackReporter', function () {
  describe('Create instance', function () {
    it('', function () {
      const options = {
        webhook: '',
        slackName: '',
        slackIconUrl: '',
        attachFailureCase: true,
        notifyTestStartMessage: true,
        resultsUrl: ''
      };
      expect(new SlackReporter(undefined)).toThrow(TypeError);
    })
  })
})