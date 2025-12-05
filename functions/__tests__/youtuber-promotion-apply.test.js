/**
 * YouTuber 推廣計畫 API 測試
 */

describe('YouTuber 推廣計畫 API', () => {
  const handler = require('../youtuber-promotion-apply').handler;

  test('應該拒絕非 POST 請求', async () => {
    const event = {
      httpMethod: 'GET',
      body: '{}'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(405);
    expect(response.body).toContain('只允許 POST 請求');
  });

  test('應該驗證必填欄位', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        channelName: 'Test Channel'
        // 缺少其他必填欄位
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('缺少必填欄位');
  });

  test('應該驗證訂閱數', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        channelName: 'Test Channel',
        channelUrl: 'https://youtube.com/@test',
        subscriberCount: 500, // 少於 1000
        email: 'test@example.com',
        lineId: '@test123',
        channelType: 'tech',
        channelDescription: 'Test',
        filmingPlan: 'Test plan'
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('訂閱數必須達到 1000+');
  });

  test('應該驗證 Email 格式', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        channelName: 'Test Channel',
        channelUrl: 'https://youtube.com/@test',
        subscriberCount: 5000,
        email: 'invalid-email', // 無效的 email
        lineId: '@test123',
        channelType: 'tech',
        channelDescription: 'Test',
        filmingPlan: 'Test plan'
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Email 格式不正確');
  });

  test('應該處理 OPTIONS 請求', async () => {
    const event = {
      httpMethod: 'OPTIONS'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
  });
});

