/**
 * AI 風格圖片分析 API - 貼圖大亨
 * 快速返回任務 ID，並觸發 Background Worker 異步處理
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getSupabaseClient } = require('./supabase-client');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // 處理 CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET 請求：查詢任務狀態
  if (event.httpMethod === 'GET') {
    try {
      const taskId = event.queryStringParameters?.taskId;

      if (!taskId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '缺少 taskId 參數' })
        };
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('style_analysis_tasks')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (error) throw error;

      if (!data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: '任務不存在' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          taskId: data.task_id,
          status: data.status,
          progress: data.progress || 0,
          result: data.result || null,
          error: data.error_message || null
        })
      };

    } catch (error) {
      console.error('❌ 查詢任務失敗:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }
  }

  // POST 請求：創建分析任務
  if (event.httpMethod === 'POST') {
    try {
      const { image } = JSON.parse(event.body);

      if (!image) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '請提供圖片' })
        };
      }

      // 創建任務
      const taskId = uuidv4();
      const supabase = getSupabaseClient();

      console.log(`🆕 創建風格分析任務: ${taskId}`);

      const { error: insertError } = await supabase
        .from('style_analysis_tasks')
        .insert({
          task_id: taskId,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // 觸發 Background Worker（使用 axios 確保兼容性）
      const workerUrl = `${process.env.URL || 'https://sticker-tycoon.netlify.app'}/.netlify/functions/analyze-style-image-background`;
      console.log(`🚀 觸發 Background Worker: ${workerUrl}`);

      // 使用 axios 異步調用，不等待結果
      axios.post(workerUrl, {
        taskId,
        imageData: image
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 // 5 秒超時（只是觸發，不等待完成）
      }).then(res => {
        console.log(`📡 Worker 回應狀態: ${res.status}`);
      }).catch(err => {
        console.error('❌ Worker 調用失敗:', err.message);
        // 即使調用失敗，任務也已創建，用戶可以稍後重試
      });

      // 立即返回任務 ID
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          taskId: taskId,
          message: '分析任務已創建，請輪詢查詢結果'
        })
      };

    } catch (error) {
      console.error('❌ 創建任務失敗:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, error: 'Method not allowed' })
  };
};

