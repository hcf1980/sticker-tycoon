/**
 * 異步工具庫 - 統一異步代碼管理
 * 提供超時保護、重試邏輯、並發控制等通用異步工具
 */

function withTimeout(promise, timeoutMs = 30000, operationName = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`Operation timeout: ${operationName} exceeded ${timeoutMs}ms`));
      }, timeoutMs)
    )
  ]);
}

async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
      const delay = Math.min(exponentialDelay, maxDelayMs);
      const jitter = delay * 0.1 * Math.random();
      const finalDelay = delay + (Math.random() > 0.5 ? jitter : -jitter);

      onRetry(attempt, error, finalDelay);

      await sleep(finalDelay);
    }
  }

  throw lastError;
}

function parallelLimit(tasks, limit = 5, options = {}) {
  const { onProgress = () => {} } = options;
  const results = new Array(tasks.length);
  let completed = 0;
  let inProgress = 0;
  let nextIndex = 0;

  return new Promise((resolve, reject) => {
    const startTask = async () => {
      if (nextIndex >= tasks.length) {
        return;
      }

      const index = nextIndex++;
      inProgress++;

      try {
        results[index] = await tasks[index]();
        completed++;
        onProgress(completed, tasks.length);
      } catch (error) {
        reject(error);
        return;
      }

      inProgress--;

      if (nextIndex < tasks.length) {
        startTask();
      } else if (inProgress === 0) {
        resolve(results);
      }
    };

    for (let i = 0; i < Math.min(limit, tasks.length); i++) {
      startTask();
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queueTasks(tasks, options = {}) {
  const { onProgress = () => {} } = options;
  const results = [];

  for (let i = 0; i < tasks.length; i++) {
    results.push(await tasks[i]());
    onProgress(i + 1, tasks.length);
  }

  return results;
}

function asyncMap(items, fn, limit = 5) {
  const tasks = items.map((item, index) => () => fn(item, index));
  return parallelLimit(tasks, limit);
}

async function asyncFilter(items, predicate, limit = 5) {
  const results = await asyncMap(items, predicate, limit);
  return items.filter((_, index) => results[index]);
}

async function asyncReduce(items, reducer, initialValue) {
  let accumulator = initialValue;

  for (let index = 0; index < items.length; index++) {
    accumulator = await reducer(accumulator, items[index], index);
  }

  return accumulator;
}

async function asyncFinally(fn, finallyFn) {
  try {
    return await fn();
  } finally {
    await finallyFn();
  }
}

function raceSuccess(promises, operationName = 'operation') {
  const errors = [];

  return new Promise((resolve, reject) => {
    let resolved = false;

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(result => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        })
        .catch(error => {
          errors[index] = error;

          if (errors.length === promises.length) {
            reject(new Error(
              `${operationName}: All promises failed - ${errors.map(e => e.message).join(', ')}`
            ));
          }
        });
    });
  });
}

async function batchAsync(items, fn, options = {}) {
  const { batchSize = 10, delayMs = 0 } = options;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    if (i + batchSize < items.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}

function withTimeoutRetry(fn, options = {}) {
  const { timeoutMs = 30000, maxAttempts = 3, ...retryOptions } = options;

  return withRetry(
    () => withTimeout(fn(), timeoutMs, 'api call'),
    { maxAttempts, ...retryOptions }
  );
}

function debounceAsync(fn, delayMs) {
  let timeoutId;

  return function debouncedFn(...args) {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  };
}

function throttleAsync(fn, delayMs) {
  let lastTime = 0;
  const lastPromise = Promise.resolve();

  return function throttledFn(...args) {
    const now = Date.now();

    if (now - lastTime >= delayMs) {
      lastTime = now;
      return fn.apply(this, args);
    }

    return lastPromise;
  };
}

function cacheAsync(fn, options = {}) {
  const { ttlMs = 60000, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = new Map();

  return async function cachedFn(...args) {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.time < ttlMs) {
      return cached.value;
    }

    const value = await fn.apply(this, args);
    cache.set(key, { value, time: Date.now() });

    return value;
  };
}

module.exports = {
  withTimeout,
  withRetry,
  withTimeoutRetry,
  parallelLimit,
  queueTasks,
  sleep,
  asyncMap,
  asyncFilter,
  asyncReduce,
  batchAsync,
  raceSuccess,
  asyncFinally,
  debounceAsync,
  throttleAsync,
  cacheAsync
};
