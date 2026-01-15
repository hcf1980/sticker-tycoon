#!/bin/bash

# 測試 Beacon Webhook 的腳本
# 使用方法: ./test-beacon-webhook.sh

WEBHOOK_URL="https://你的網站.netlify.app/.netlify/functions/beacon-webhook"

echo "🧪 測試 Beacon Webhook..."
echo "📡 發送模擬 Beacon 進入事件..."

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test_signature" \
  -d '{
    "events": [
      {
        "type": "beacon",
        "replyToken": "test_reply_token",
        "source": {
          "type": "user",
          "userId": "U1234567890abcdef1234567890abcdef"
        },
        "timestamp": 1234567890123,
        "beacon": {
          "hwid": "0000000019",
          "type": "enter",
          "dm": "1234567890abcdef"
        }
      }
    ]
  }'

echo ""
echo "✅ 測試完成！"
echo "📊 請到以下位置查看結果："
echo "   1. Netlify Functions 日誌"
echo "   2. Supabase beacon_events 表"
echo "   3. https://你的網站.netlify.app/admin/beacon-events.html"

