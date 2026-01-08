/**
 * Sticker Styles Module Tests
 * 測試貼圖風格相關的純函數
 */

const {
  StickerStyles,
  ExpressionEnhancer,
  DefaultExpressions,
  SceneTemplates,
  FramingTemplates,
  generateCharacterID,
  generateStickerPrompt,
  generateStickerPromptV2,
  getAllStyles,
  getAllExpressionTemplates,
  getAllSceneTemplates,
  getAllFramingTemplates,
  getSceneConfig,
  getFramingConfig,
  getExpressionEnhancement,
  LineStickerSpecs
} = require('../sticker-styles');

describe('sticker-styles.js', () => {

  // ============================================
  // 1. StickerStyles 測試
  // ============================================
  describe('StickerStyles', () => {
    test('應該包含所有預期的風格', () => {
      const expectedStyles = ['realistic', 'cute', 'cool', 'funny', 'simple', 'anime', 'pixel', 'sketch'];
      expectedStyles.forEach(style => {
        expect(StickerStyles[style]).toBeDefined();
      });
    });

    test('每個風格應該有必要的屬性', () => {
      Object.values(StickerStyles).forEach(style => {
        expect(style).toHaveProperty('id');
        expect(style).toHaveProperty('name');
        expect(style).toHaveProperty('emoji');
        expect(style).toHaveProperty('description');
        expect(style).toHaveProperty('promptBase');
        expect(style).toHaveProperty('negativePrompt');
      });
    });

    test('風格 ID 應該與 key 一致', () => {
      Object.entries(StickerStyles).forEach(([key, style]) => {
        expect(style.id).toBe(key);
      });
    });
  });

  // ============================================
  // 2. generateCharacterID 測試
  // ============================================
  describe('generateCharacterID', () => {
    test('應該生成 12 位字元的 ID', () => {
      const id = generateCharacterID('test character');
      expect(id).toHaveLength(12);
    });

    test('相同描述應該生成相同 ID（一致性）', () => {
      const desc = 'cute girl with long black hair';
      const id1 = generateCharacterID(desc);
      const id2 = generateCharacterID(desc);
      expect(id1).toBe(id2);
    });

    test('不同描述應該生成不同 ID', () => {
      const id1 = generateCharacterID('character A');
      const id2 = generateCharacterID('character B');
      expect(id1).not.toBe(id2);
    });

    test('應該只包含十六進位字元', () => {
      const id = generateCharacterID('test');
      expect(id).toMatch(/^[a-f0-9]+$/);
    });
  });

  // ============================================
  // 3. generateStickerPrompt 測試（舊版）
  // ============================================
  describe('generateStickerPrompt', () => {
    test('應該返回 prompt 和 negativePrompt', () => {
      const result = generateStickerPrompt('cute', 'a cat', 'happy');
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('negativePrompt');
    });

    test('prompt 應該包含風格、角色描述和表情', () => {
      const result = generateStickerPrompt('cute', 'a cute cat', 'smiling');
      expect(result.prompt).toContain('a cute cat');
      expect(result.prompt).toContain('smiling');
    });

    test('未知風格應該使用 cute 作為預設', () => {
      const result = generateStickerPrompt('unknown_style', 'test', 'test');
      // 應該不會拋出錯誤，並使用 cute 風格
      expect(result.prompt).toBeDefined();
    });
  });

  // ============================================
  // 4. generateStickerPromptV2 測試（增強版）
  // ============================================
  describe('generateStickerPromptV2', () => {
    test('應該返回 prompt、negativePrompt 和 characterID', () => {
      const result = generateStickerPromptV2('anime', 'anime girl', '開心');
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('negativePrompt');
      expect(result).toHaveProperty('characterID');
    });

    test('characterID 應該基於角色描述生成', () => {
      const desc = 'unique character description';
      const result = generateStickerPromptV2('cute', desc, '微笑');
      expect(result.characterID).toBe(generateCharacterID(desc));
    });

    test('prompt 應該包含風格增強元素', () => {
      const result = generateStickerPromptV2('cool', 'cool guy', 'confident');
      expect(result.prompt).toContain('LIGHTING');
      expect(result.prompt).toContain('COMPOSITION');
    });
  });

  // ============================================
  // 5. DefaultExpressions 測試
  // ============================================
  describe('DefaultExpressions', () => {
    test('應該包含所有預期的表情模板', () => {
      const expectedTemplates = ['basic', 'cute', 'office', 'social', 'emotion', 'special'];
      expectedTemplates.forEach(template => {
        expect(DefaultExpressions[template]).toBeDefined();
      });
    });

    test('每個模板應該有 24 個表情', () => {
      Object.values(DefaultExpressions).forEach(template => {
        expect(template.expressions).toHaveLength(24);
      });
    });

    test('每個模板應該有必要的屬性', () => {
      Object.values(DefaultExpressions).forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('emoji');
        expect(template).toHaveProperty('expressions');
      });
    });
  });

  // ============================================
  // 6. ExpressionEnhancer 測試
  // ============================================
  describe('ExpressionEnhancer', () => {
    test('應該返回表情的增強描述（透過直接存取）', () => {
      const enhancement = ExpressionEnhancer['開心'];
      expect(enhancement).toBeDefined();
      expect(enhancement).toHaveProperty('action');
      expect(enhancement).toHaveProperty('popText');
      expect(enhancement).toHaveProperty('decorations');
    });

    test('未知表情應該返回 undefined', () => {
      const enhancement = ExpressionEnhancer['這是一個不存在的表情名稱xyz'];
      expect(enhancement).toBeUndefined();
    });

    test('getExpressionEnhancement 應該返回表情增強或原始表情', () => {
      const existing = getExpressionEnhancement('開心');
      expect(existing).toHaveProperty('action');

      const notExisting = getExpressionEnhancement('不存在的表情');
      expect(notExisting).toBe('不存在的表情');
    });
  });

  // ============================================
  // 7. SceneTemplates 測試
  // ============================================
  describe('SceneTemplates', () => {
    test('應該包含 none 場景', () => {
      expect(SceneTemplates.none).toBeDefined();
    });

    test('每個場景應該有必要的屬性', () => {
      Object.values(SceneTemplates).forEach(scene => {
        expect(scene).toHaveProperty('id');
        expect(scene).toHaveProperty('name');
        // 實際結構使用 decorationStyle 而非 promptHint
        expect(scene).toHaveProperty('decorationStyle');
      });
    });
  });

  // ============================================
  // 8. FramingTemplates 測試
  // ============================================
  describe('FramingTemplates', () => {
    test('應該包含預期的取景類型', () => {
      const expectedFramings = ['fullbody', 'halfbody', 'portrait', 'closeup'];
      expectedFramings.forEach(framing => {
        expect(FramingTemplates[framing]).toBeDefined();
      });
    });

    test('每個取景應該有必要的屬性', () => {
      Object.values(FramingTemplates).forEach(framing => {
        expect(framing).toHaveProperty('id');
        expect(framing).toHaveProperty('name');
        expect(framing).toHaveProperty('promptAddition');
        expect(framing).toHaveProperty('characterFocus');
      });
    });
  });

  // ============================================
  // 9. 工具函數測試
  // ============================================
  describe('getAllStyles', () => {
    test('應該返回所有風格的陣列', () => {
      const styles = getAllStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });
  });

  describe('getAllExpressionTemplates', () => {
    test('應該返回所有表情模板的陣列', () => {
      const templates = getAllExpressionTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('getAllSceneTemplates', () => {
    test('應該返回所有場景模板的陣列', () => {
      const scenes = getAllSceneTemplates();
      expect(Array.isArray(scenes)).toBe(true);
      expect(scenes.length).toBeGreaterThan(0);
    });
  });

  describe('getAllFramingTemplates', () => {
    test('應該返回所有取景模板的陣列', () => {
      const framings = getAllFramingTemplates();
      expect(Array.isArray(framings)).toBe(true);
      expect(framings.length).toBeGreaterThan(0);
    });
  });

  describe('getSceneConfig', () => {
    test('應該根據 ID 返回場景配置', () => {
      const config = getSceneConfig('none');
      expect(config).toBeDefined();
      expect(config.id).toBe('none');
    });

    test('未知 ID 應該返回 none 場景', () => {
      const config = getSceneConfig('unknown_scene_id');
      expect(config).toBeDefined();
    });
  });

  describe('getFramingConfig', () => {
    test('應該根據 ID 返回取景配置', () => {
      const config = getFramingConfig('portrait');
      expect(config).toBeDefined();
      expect(config.id).toBe('portrait');
    });
  });

  // ============================================
  // 10. LineStickerSpecs 測試
  // ============================================
  describe('LineStickerSpecs', () => {
    test('應該有正確的貼圖尺寸規格', () => {
      expect(LineStickerSpecs.stickerImage).toEqual({
        maxWidth: 370,
        maxHeight: 320,
        description: '單張貼圖最大尺寸'
      });
    });

    test('應該有正確的主圖尺寸規格', () => {
      expect(LineStickerSpecs.mainImage).toEqual({
        width: 240,
        height: 240,
        description: '貼圖組封面圖'
      });
    });

    test('應該有正確的標籤尺寸規格', () => {
      expect(LineStickerSpecs.tabImage).toEqual({
        width: 96,
        height: 74,
        description: '聊天室貼圖選單標籤'
      });
    });

    test('應該有正確的有效數量', () => {
      expect(LineStickerSpecs.validCounts).toEqual([4, 8, 12]);
    });

    test('應該有正確的檔案大小限制', () => {
      expect(LineStickerSpecs.maxFileSize).toBe(1024 * 1024); // 1MB
      expect(LineStickerSpecs.maxZipSize).toBe(60 * 1024 * 1024); // 60MB
    });

    test('應該有正確的文字限制', () => {
      expect(LineStickerSpecs.textLimits).toHaveProperty('creatorName');
      expect(LineStickerSpecs.textLimits).toHaveProperty('stickerName');
      expect(LineStickerSpecs.textLimits).toHaveProperty('description');
    });

    test('應該有正確的檔案命名規則', () => {
      expect(LineStickerSpecs.fileNaming.main).toBe('main.png');
      expect(LineStickerSpecs.fileNaming.tab).toBe('tab.png');
      expect(LineStickerSpecs.fileNaming.sticker(1)).toBe('01.png');
      expect(LineStickerSpecs.fileNaming.sticker(10)).toBe('10.png');
    });
  });
});

