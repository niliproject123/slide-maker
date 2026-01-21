import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PROVIDER_REGISTRY,
  DEFAULT_MODEL,
  getProvider,
  getAvailableProviders,
  getDefaultProviderId,
  hasAnyProvider,
} from './providerRegistry.js';

describe('Provider Registry', () => {
  // Save original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear env before each test
    delete process.env.OPENAI_API_KEY;
    delete process.env.FAL_KEY;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('PROVIDER_REGISTRY', () => {
    it('should contain expected providers', () => {
      expect(PROVIDER_REGISTRY['openai-dalle3']).toBeDefined();
      expect(PROVIDER_REGISTRY['fal-flux-turbo']).toBeDefined();
      expect(PROVIDER_REGISTRY['fal-flux-pro']).toBeDefined();
    });

    it('should have correct provider info for DALL-E 3', () => {
      const dalleEntry = PROVIDER_REGISTRY['openai-dalle3'];
      expect(dalleEntry.name).toBe('DALL-E 3');
      expect(dalleEntry.provider).toBe('openai');
      expect(dalleEntry.capabilities.supportsImageReference).toBe(false);
      expect(dalleEntry.envKey).toBe('OPENAI_API_KEY');
    });

    it('should have correct provider info for FLUX Turbo', () => {
      const fluxEntry = PROVIDER_REGISTRY['fal-flux-turbo'];
      expect(fluxEntry.name).toBe('FLUX.2 Turbo (Fast & Cheap)');
      expect(fluxEntry.provider).toBe('fal');
      expect(fluxEntry.capabilities.supportsImageReference).toBe(true);
      expect(fluxEntry.envKey).toBe('FAL_KEY');
    });
  });

  describe('DEFAULT_MODEL', () => {
    it('should be fal-flux-turbo', () => {
      expect(DEFAULT_MODEL).toBe('fal-flux-turbo');
    });
  });

  describe('getProvider', () => {
    it('should throw for unknown provider', () => {
      expect(() => getProvider('unknown-provider')).toThrow('Unknown provider: unknown-provider');
    });

    it('should return a provider instance for valid id', () => {
      process.env.FAL_KEY = 'test-key';
      const provider = getProvider('fal-flux-turbo');
      expect(provider).toBeDefined();
      expect(provider.info.id).toBe('fal-flux-turbo');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return empty array when no keys configured', () => {
      const available = getAvailableProviders();
      expect(available).toEqual([]);
    });

    it('should return OpenAI when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const available = getAvailableProviders();
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('openai-dalle3');
    });

    it('should return FAL providers when FAL_KEY is set', () => {
      process.env.FAL_KEY = 'test-key';
      const available = getAvailableProviders();
      expect(available.length).toBe(2);
      expect(available.map(p => p.id)).toContain('fal-flux-turbo');
      expect(available.map(p => p.id)).toContain('fal-flux-pro');
    });

    it('should return all providers when all keys are set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.FAL_KEY = 'test-key';
      const available = getAvailableProviders();
      expect(available.length).toBe(3);
    });
  });

  describe('getDefaultProviderId', () => {
    it('should return default model when FAL_KEY is set', () => {
      process.env.FAL_KEY = 'test-key';
      expect(getDefaultProviderId()).toBe('fal-flux-turbo');
    });

    it('should return OpenAI when only OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(getDefaultProviderId()).toBe('openai-dalle3');
    });

    it('should return default model even when no keys configured', () => {
      expect(getDefaultProviderId()).toBe('fal-flux-turbo');
    });
  });

  describe('hasAnyProvider', () => {
    it('should return false when no keys configured', () => {
      expect(hasAnyProvider()).toBe(false);
    });

    it('should return true when FAL_KEY is set', () => {
      process.env.FAL_KEY = 'test-key';
      expect(hasAnyProvider()).toBe(true);
    });

    it('should return true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(hasAnyProvider()).toBe(true);
    });
  });
});
