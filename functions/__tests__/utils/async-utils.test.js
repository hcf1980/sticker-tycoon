/**
 * 異步工具庫測試
 */

const asyncUtils = require('../../utils/async-utils');

describe('Async Utils - Task 2', () => {
  describe('withTimeout', () => {
    test('應該在時間內成功', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 100);
      });
      const result = await asyncUtils.withTimeout(promise, 1000, 'test');
      expect(result).toBe('success');
    });

    test('應該在超時時拋出錯誤', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 2000);
      });
      await expect(asyncUtils.withTimeout(promise, 500, 'test')).rejects.toThrow();
    });
  });

  describe('withRetry', () => {
    test('應該在第一次就成功', async () => {
      let attempts = 0;
      const result = await asyncUtils.withRetry(async () => {
        attempts++;
        return 'success';
      });
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    test('應該在失敗後重試', async () => {
      let attempts = 0;
      const result = await asyncUtils.withRetry(async () => {
        attempts++;
        if (attempts < 3) throw new Error('failed');
        return 'success';
      }, { maxAttempts: 5 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('parallelLimit', () => {
    test('應該執行所有任務', async () => {
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3)
      ];
      const results = await asyncUtils.parallelLimit(tasks);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('queueTasks', () => {
    test('應該按順序執行', async () => {
      const order = [];
      const tasks = [
        async () => { order.push(1); return 1; },
        async () => { order.push(2); return 2; },
        async () => { order.push(3); return 3; }
      ];
      const results = await asyncUtils.queueTasks(tasks);
      expect(order).toEqual([1, 2, 3]);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('sleep', () => {
    test('應該延遲', async () => {
      const start = Date.now();
      await asyncUtils.sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('asyncMap', () => {
    test('應該映射所有項目', async () => {
      const items = [1, 2, 3];
      const results = await asyncUtils.asyncMap(items, async (x) => x * 2, 3);
      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('asyncFilter', () => {
    test('應該過濾項目', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await asyncUtils.asyncFilter(items, async (x) => x > 2, 3);
      expect(results).toEqual([3, 4, 5]);
    });
  });

  describe('asyncReduce', () => {
    test('應該歸約項目', async () => {
      const items = [1, 2, 3, 4];
      const result = await asyncUtils.asyncReduce(items, async (acc, item) => acc + item, 0);
      expect(result).toBe(10);
    });
  });

  describe('cacheAsync', () => {
    test('應該緩存結果', async () => {
      let callCount = 0;
      const cachedFn = asyncUtils.cacheAsync(async (x) => {
        callCount++;
        return x * 2;
      }, { ttlMs: 1000 });
      const result1 = await cachedFn(5);
      const result2 = await cachedFn(5);
      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(callCount).toBe(1);
    });
  });
});
