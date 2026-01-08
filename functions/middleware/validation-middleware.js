/**
 * 驗證中間件 v1.0
 * 為 API 端點提供輸入驗證功能
 */

const { validateInput, validateMultiple } = require('../utils/input-validator');

/**
 * 驗證查詢參數中間件
 *
 * @param {object} requiredFields - 必需字段對象 {fieldName: schemaName}
 * @returns {Function} 中間件函數
 *
 * @example
 * const handler = validateQueryParams({
 *   code: 'referralCode',
 *   userId: 'userId'
 * })((event) => {
 *   // event.validatedQuery 包含驗證後的查詢參數
 * });
 */
function validateQueryParams(requiredFields) {
  return (handler) => (event) => {
    const errors = {};
    const validated = {};

    // 驗證每個查詢參數
    for (const [field, schema] of Object.entries(requiredFields)) {
      const value = event.queryStringParameters?.[field];

      if (!value) {
        errors[field] = `缺少必需參數: ${field}`;
        continue;
      }

      const result = validateInput(value, schema);

      if (!result.success) {
        errors[field] = result.error;
      } else {
        validated[field] = result.data;
      }
    }

    // 如果有驗證錯誤，返回 400
    if (Object.keys(errors).length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: '無效的查詢參數',
          details: errors
        })
      };
    }

    // 將驗證後的參數附加到事件對象
    event.validatedQuery = validated;

    // 調用原始處理器
    return handler(event);
  };
}

/**
 * 驗證請求體中間件
 *
 * @param {object} schema - 驗證規則對象 {fieldName: schemaName}
 * @returns {Function} 中間件函數
 *
 * @example
 * const handler = validateBody({
 *   code: 'referralCode',
 *   userId: 'userId'
 * })(async (event) => {
 *   // event.validatedBody 包含驗證後的請求體
 * });
 */
function validateBody(schema) {
  return (handler) => (event) => {
    try {
      // 解析請求體
      const body = JSON.parse(event.body || '{}');

      // 驗證請求體
      const result = validateMultiple(body, schema);

      if (!result.success) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: '無效的請求體',
            details: result.errors
          })
        };
      }

      // 將驗證後的數據附加到事件對象
      event.validatedBody = result.data;

      // 調用原始處理器
      return handler(event);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: '無效的 JSON 格式'
          })
        };
      }
      throw error;
    }
  };
}

/**
 * 驗證路徑參數中間件
 *
 * @param {object} schema - 驗證規則對象
 * @returns {Function} 中間件函數
 */
function validatePathParams(schema) {
  return (handler) => (event) => {
    const errors = {};
    const validated = {};

    for (const [field, schemaName] of Object.entries(schema)) {
      const value = event.pathParameters?.[field];

      if (!value) {
        errors[field] = `缺少路徑參數: ${field}`;
        continue;
      }

      const result = validateInput(value, schemaName);

      if (!result.success) {
        errors[field] = result.error;
      } else {
        validated[field] = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: '無效的路徑參數',
          details: errors
        })
      };
    }

    event.validatedPath = validated;
    return handler(event);
  };
}

/**
 * 組合多個驗證中間件
 *
 * @param {...Function} middlewares - 中間件函數列表
 * @returns {Function} 組合後的中間件
 *
 * @example
 * const handler = compose(
 *   validateQueryParams({ code: 'referralCode' }),
 *   validateBody({ userId: 'userId' })
 * )(async (event) => {
 *   // event.validatedQuery 和 event.validatedBody 都已驗證
 * });
 */
function compose(...middlewares) {
  return (handler) => {
    return (event) => {
      let current = handler;

      // 從後向前組合中間件
      for (let i = middlewares.length - 1; i >= 0; i--) {
        const middleware = middlewares[i];
        current = middleware(current);
      }

      return current(event);
    };
  };
}

/**
 * 快速驗證輔助函數 - 直接在 handler 中使用
 *
 * @example
 * exports.handler = async (event) => {
 *   const { error, data } = validateRequest(event, {
 *     query: { code: 'referralCode' },
 *     body: { userId: 'userId' }
 *   });
 *
 *   if (error) {
 *     return createErrorResponse(error);
 *   }
 *
 *   // 使用 data.query 和 data.body
 * };
 */
function validateRequest(event, schema = {}) {
  const errors = {};
  const data = {};

  // 驗證查詢參數
  if (schema.query) {
    const queryResult = validateMultiple(event.queryStringParameters || {}, schema.query);
    if (!queryResult.success) {
      errors.query = queryResult.errors;
    } else {
      data.query = queryResult.data;
    }
  }

  // 驗證請求體
  if (schema.body) {
    try {
      const body = JSON.parse(event.body || '{}');
      const bodyResult = validateMultiple(body, schema.body);
      if (!bodyResult.success) {
        errors.body = bodyResult.errors;
      } else {
        data.body = bodyResult.data;
      }
    } catch {
      errors.body = { _root: '無效的 JSON 格式' };
    }
  }

  // 驗證路徑參數
  if (schema.path) {
    const pathResult = validateMultiple(event.pathParameters || {}, schema.path);
    if (!pathResult.success) {
      errors.path = pathResult.errors;
    } else {
      data.path = pathResult.data;
    }
  }

  // 如果有錯誤，返回第一個錯誤
  if (Object.keys(errors).length > 0) {
    const errorKey = Object.keys(errors)[0];
    const errorDetails = errors[errorKey];
    return {
      error: {
        message: `驗證失敗 (${errorKey})`,
        details: errorDetails
      },
      data: null
    };
  }

  return {
    error: null,
    data
  };
}

module.exports = {
  validateQueryParams,
  validateBody,
  validatePathParams,
  compose,
  validateRequest
};
