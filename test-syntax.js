// 測試語法檢查
const { z } = require('zod');

const testSchema = z.string().min(1);

console.log('Syntax OK');

