#!/usr/bin/env node
/**
 * 語法檢查腳本
 * 檢查所有 functions 目錄下的 JS 文件是否有語法錯誤
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const functionsDir = path.join(__dirname, 'functions');
const errors = [];

function checkFile(filePath) {
  try {
    // 使用 node -c 檢查語法
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return null;
  } catch (error) {
    return {
      file: filePath,
      error: error.message
    };
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '__tests__') {
        walkDir(filePath);
      }
    } else if (file.endsWith('.js')) {
      const error = checkFile(filePath);
      if (error) {
        errors.push(error);
      }
    }
  }
}

console.log('🔍 開始檢查語法...\n');
walkDir(functionsDir);

if (errors.length === 0) {
  console.log('✅ 所有文件語法正確！');
} else {
  console.log(`❌ 發現 ${errors.length} 個文件有語法錯誤：\n`);
  errors.forEach(({ file, error }) => {
    console.log(`📄 ${path.relative(__dirname, file)}`);
    console.log(`   ${error}\n`);
  });
  process.exit(1);
}

