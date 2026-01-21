import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateMockImages,
  shouldUseMock,
  hasAnyProvider,
  getAvailableProviders,
  getDefaultProviderId,
  DEFAULT_MODEL,
} from './index.js';

describe('Image Generation Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.FAL_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('generateMockImages', () => {
    it('should generate specified number of mock images', () => {
      const result = generateMockImages(3);

      expect(result.images.length).toBe(3);
      expect(result.model).toBe('mock');
      expect(result.provider).toBe('mock');
    });

    it('should generate images with picsum URLs', () => {
      const result = generateMockImages(1);

      expect(result.images[0].url).toContain('picsum.photos');
    });

    it('should generate unique URLs for each image', () => {
      const result = generateMockImages(4);

      const urls = result.images.map(img => img.url);
      const uniqueUrls = new Set(urls);

      expect(uniqueUrls.size).toBe(4);
    });

    it('should default to 1 image when no count specified', () => {
      const result = generateMockImages();

      expect(result.images.length).toBe(1);
    });
  });

  describe('shouldUseMock', () => {
    it('should return true when no providers configured', () => {
      expect(shouldUseMock()).toBe(true);
    });

    it('should return false when FAL_KEY is set', () => {
      process.env.FAL_KEY = 'test-key';
      expect(shouldUseMock()).toBe(false);
    });

    it('should return false when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(shouldUseMock()).toBe(false);
    });
  });

  describe('exports', () => {
    it('should export hasAnyProvider', () => {
      expect(typeof hasAnyProvider).toBe('function');
    });

    it('should export getAvailableProviders', () => {
      expect(typeof getAvailableProviders).toBe('function');
    });

    it('should export getDefaultProviderId', () => {
      expect(typeof getDefaultProviderId).toBe('function');
    });

    it('should export DEFAULT_MODEL', () => {
      expect(DEFAULT_MODEL).toBe('fal-flux-turbo');
    });
  });
});
