-- 添加 ZIP 相關欄位到 listing_applications 表

-- 添加 zip_cache_url 欄位（儲存生成好的 ZIP 下載連結）
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;

-- 添加 zip_generating 欄位（標記是否正在生成 ZIP）
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;

-- 註釋
COMMENT ON COLUMN listing_applications.zip_cache_url IS '下載包快取 URL';
COMMENT ON COLUMN listing_applications.zip_generating IS '是否正在生成 ZIP';

