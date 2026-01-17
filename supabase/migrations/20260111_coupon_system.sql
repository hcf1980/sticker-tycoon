-- ============================================
-- 貼圖大亨 - 優惠券系統 (Coupon System)
-- 需求：
-- - 每個活動一組固定兌換碼
-- - 用戶輸入兌換碼即刻加張數
-- - 單一用戶每個活動僅能使用一次
-- - 可統計歷史使用狀況
-- ============================================

-- 啟用必要 extension（若已存在不影響）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- coupon_campaigns：優惠券活動
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupon_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slogan TEXT NULL,
  token_amount INTEGER NOT NULL CHECK (token_amount > 0),
  redeem_code TEXT NOT NULL,
  claim_start_at TIMESTAMPTZ NOT NULL,
  claim_end_at TIMESTAMPTZ NOT NULL,
  activate_start_at TIMESTAMPTZ NOT NULL,
  activate_end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT coupon_campaigns_redeem_code_unique UNIQUE (redeem_code),
  CONSTRAINT coupon_campaigns_claim_window_valid CHECK (claim_end_at >= claim_start_at),
  CONSTRAINT coupon_campaigns_activate_window_valid CHECK (activate_end_at >= activate_start_at)
);

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_is_active ON public.coupon_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_claim_window ON public.coupon_campaigns(claim_start_at, claim_end_at);
CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_activate_window ON public.coupon_campaigns(activate_start_at, activate_end_at);

-- ============================================
-- coupon_redemptions：兌換紀錄
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  redeem_code TEXT NOT NULL,
  token_amount INTEGER NOT NULL CHECK (token_amount > 0),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 單一用戶每個活動只能成功兌換一次（不分 status，避免繞過）
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_campaign_user ON public.coupon_redemptions(campaign_id, user_id);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_redeem_code ON public.coupon_redemptions(redeem_code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_created_at ON public.coupon_redemptions(created_at);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_campaign_created_at ON public.coupon_redemptions(campaign_id, created_at);

-- ============================================
-- updated_at 觸發器（若你專案已有可略過；這裡採最小可用）
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coupon_campaigns_set_updated_at ON public.coupon_campaigns;
CREATE TRIGGER trg_coupon_campaigns_set_updated_at
BEFORE UPDATE ON public.coupon_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 一般用戶：可讀取啟用中的活動（若你不想公開活動可移除）
DROP POLICY IF EXISTS "coupon_campaigns_select_public" ON public.coupon_campaigns;
CREATE POLICY "coupon_campaigns_select_public"
ON public.coupon_campaigns
FOR SELECT
USING (is_active = TRUE);

-- 一般用戶：只能讀取自己的兌換紀錄（user_id 由前端/後端寫入，這裡僅示意；實務上主要走 service role function）
DROP POLICY IF EXISTS "coupon_redemptions_select_own" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_select_own"
ON public.coupon_redemptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()::text
  )
);

-- 禁止 anon 直接 insert/update/delete（透過 service role 的 Netlify Functions 處理）
DROP POLICY IF EXISTS "coupon_redemptions_write_denied" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_write_denied"
ON public.coupon_redemptions
FOR ALL
USING (FALSE)
WITH CHECK (FALSE);
