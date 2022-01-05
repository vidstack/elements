import { RequestQueue } from '../RequestQueue';

test('it should return correct queue size', () => {
  const q = new RequestQueue();

  q.queue('a', () => {});
  q.queue('b', () => {});

  expect(q.size).to.equal(2);
});

test('it should serve items in queue', async () => {
  const q = new RequestQueue();

  const itemA = vi.fn();
  const itemB = vi.fn();

  q.queue('a', itemA);
  q.queue('b', itemB);

  expect(itemA).not.toHaveBeenCalled();
  expect(itemB).not.toHaveBeenCalled();

  await q.serve('a');
  expect(itemA).to.toHaveBeenCalledOnce();
  expect(itemB).not.toHaveBeenCalled();
  expect(q.size).to.equal(1);

  await q.serve('b');
  expect(itemB).to.toHaveBeenCalledOnce();
  expect(q.size).to.equal(0);
});

test('it should flush pending requests on start', async () => {
  const q = new RequestQueue();

  const itemA = vi.fn();
  const itemB = vi.fn();

  q.queue('a', itemA);
  q.queue('b', itemB);

  await q.start();

  expect(itemA).to.toHaveBeenCalledOnce();
  expect(itemB).to.toHaveBeenCalledOnce();
});

test('it should serve immediately once started', async () => {
  const q = new RequestQueue();

  await q.start();

  const itemA = vi.fn();
  const itemB = vi.fn();

  q.queue('a', itemA);
  q.queue('b', itemB);

  expect(itemA).to.toHaveBeenCalledOnce();
  expect(itemB).to.toHaveBeenCalledOnce();
});

test('it should not serve immediately once stopped', async () => {
  const q = new RequestQueue();

  await q.start();
  await q.stop();

  const itemA = vi.fn();
  const itemB = vi.fn();

  q.queue('a', itemA);
  q.queue('b', itemB);

  expect(itemA).not.toHaveBeenCalled();
  expect(itemB).not.toHaveBeenCalled();
});

test('it should release pending flush when started', async () => {
  const q = new RequestQueue();

  setTimeout(() => {
    q.start();
  });

  await q.waitForFlush();
});

test('it should release pending flush when destroyed', async () => {
  const q = new RequestQueue();

  setTimeout(() => {
    q.destroy();
  });

  await q.waitForFlush();
});

test('it should clear queue when destroyed', async () => {
  const q = new RequestQueue();

  const itemA = vi.fn();
  const itemB = vi.fn();

  q.queue('a', itemA);
  q.queue('b', itemB);

  await q.destroy();

  expect(itemA).not.toHaveBeenCalled();
  expect(itemB).not.toHaveBeenCalled();
  expect(q.size).to.equal(0);
});
