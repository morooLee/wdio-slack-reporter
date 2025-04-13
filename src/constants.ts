/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const SLACK_REQUEST_TYPES = {
  WEB_API_POST_MESSAGE: 'web-api:message',
  WEB_API_UPLOAD: 'web-api:upload',
  WEBHOOK_SEND: 'webhook:send',
} as const;

export const EVENTS = {
  ON_RUNNER_START: 'runner:start',
  ON_BEFORE_COMMAND: 'command:before',
  ON_AFTER_COMMAND: 'command:after',
  ON_BEFORE_ASSERTION: 'assertion:before',
  ON_AFTER_ASSERTION: 'assertion:after',
  ON_SUITE_START: 'suite:start',
  ON_HOOK_START: 'hook:start',
  ON_HOOK_END: 'hook:end',
  ON_TEST_START: 'test:start',
  ON_TEST_PASS: 'test:pass',
  ON_TEST_FAIL: 'test:fail',
  ON_TEST_RETRY: 'test:retry',
  ON_TEST_SKIP: 'test:skip',
  ON_TEST_PENDING: 'test:pending',
  ON_TEST_END: 'test:end',
  ON_SUITE_RETRY: 'suite:retry',
  ON_SUITE_END: 'suite:end',
  ON_RUNNER_END: 'runner:end',
  POST_MESSAGE: 'slack:postMessage',
  UPLOAD: 'queue:upload',
  SEND: 'queue:send',
  SCREENSHOT: 'queue:screenshot',
  RESULT: 'queue:result',
} as const;
