import { oneEvent } from '@open-wc/testing-helpers';

import { isGroupedLog } from '../groupedLog';
import { LogDispatcher } from '../LogDispatcher';
import { LogLevel } from '../LogLevel';

async function expectLogEvent(level: LogLevel) {
  const target = document.createElement('div');
  const dispatcher = new LogDispatcher(target);
  setTimeout(() => {
    dispatcher[level]('test');
  }, 0);
  const { detail } = await oneEvent(target, 'vds-log');
  expect(detail.level).to.equal(level);
  expect(detail.data).to.eql(['test']);
}

async function expectGroupedLogEvent(level: LogLevel) {
  const target = document.createElement('div');
  const dispatcher = new LogDispatcher(target);
  setTimeout(() => {
    dispatcher[`${level}Group`]('test').log('Test Message').dispatch();
  }, 0);
  const { detail } = await oneEvent(target, 'vds-log');
  expect(detail.level).to.equal(level);
  expect(isGroupedLog(detail.data[0])).to.be.true;
  expect(detail.data[0].logs).to.eql([{ data: ['Test Message'] }]);
}

test('it should dispatch log events', async () => {
  await expectLogEvent('error');
  await expectLogEvent('warn');
  await expectLogEvent('info');
  await expectLogEvent('debug');
});

test('it should dispatch group log events', async () => {
  await expectGroupedLogEvent('error');
  await expectGroupedLogEvent('warn');
  await expectGroupedLogEvent('info');
  await expectGroupedLogEvent('debug');
});
