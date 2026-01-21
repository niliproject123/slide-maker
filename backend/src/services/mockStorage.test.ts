import { describe, it, expect, beforeEach } from 'vitest';
import {
  storage,
  createProjectInternal,
  createVideoInternal,
  createFrameInternal,
  createCharacterInternal,
  createImageInternal,
  getProjectCharacterCount,
  getCharacterImageCount,
} from './mockStorage.js';

describe('Mock Storage - Characters', () => {
  beforeEach(() => {
    // Clear storage before each test
    storage.projects.clear();
    storage.videos.clear();
    storage.contexts.clear();
    storage.frames.clear();
    storage.mainChats.clear();
    storage.messages.clear();
    storage.images.clear();
    storage.characters.clear();
    storage.frameImages.clear();
    storage.contextImages.clear();
    storage.mainChatImages.clear();
    storage.galleryImages.clear();
    storage.characterImages.clear();
  });

  describe('createCharacterInternal', () => {
    it('should create a character with correct properties', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Test Character', 'A test description');

      expect(character.id).toBeDefined();
      expect(character.name).toBe('Test Character');
      expect(character.description).toBe('A test description');
      expect(character.projectId).toBe(project.id);
      expect(character.createdAt).toBeDefined();
      expect(character.updatedAt).toBeDefined();
    });

    it('should store character in storage', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Test Character', 'Description');

      expect(storage.characters.has(character.id)).toBe(true);
      expect(storage.characters.get(character.id)).toEqual(character);
    });

    it('should initialize empty characterImages set', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Test Character', 'Description');

      expect(storage.characterImages.has(character.id)).toBe(true);
      expect(storage.characterImages.get(character.id)?.size).toBe(0);
    });
  });

  describe('getProjectCharacterCount', () => {
    it('should return 0 for project with no characters', () => {
      const project = createProjectInternal('Test Project');
      expect(getProjectCharacterCount(project.id)).toBe(0);
    });

    it('should return correct count for project with characters', () => {
      const project = createProjectInternal('Test Project');
      createCharacterInternal(project.id, 'Character 1', 'Desc 1');
      createCharacterInternal(project.id, 'Character 2', 'Desc 2');
      createCharacterInternal(project.id, 'Character 3', 'Desc 3');

      expect(getProjectCharacterCount(project.id)).toBe(3);
    });

    it('should not count characters from other projects', () => {
      const project1 = createProjectInternal('Project 1');
      const project2 = createProjectInternal('Project 2');

      createCharacterInternal(project1.id, 'Character 1', 'Desc');
      createCharacterInternal(project1.id, 'Character 2', 'Desc');
      createCharacterInternal(project2.id, 'Character 3', 'Desc');

      expect(getProjectCharacterCount(project1.id)).toBe(2);
      expect(getProjectCharacterCount(project2.id)).toBe(1);
    });
  });

  describe('getCharacterImageCount', () => {
    it('should return 0 for character with no images', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Character', 'Desc');

      expect(getCharacterImageCount(character.id)).toBe(0);
    });

    it('should return correct count after adding images', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Character', 'Desc');

      // Add images to character
      const image1 = createImageInternal();
      const image2 = createImageInternal();

      const characterImages = storage.characterImages.get(character.id)!;
      characterImages.add(image1.id);
      characterImages.add(image2.id);

      expect(getCharacterImageCount(character.id)).toBe(2);
    });
  });

  describe('Character integration', () => {
    it('should allow adding images to character and retrieving them', () => {
      const project = createProjectInternal('Test Project');
      const character = createCharacterInternal(project.id, 'Hero', 'Main character');

      // Add reference images
      const refImage1 = createImageInternal('https://example.com/hero-front.png');
      const refImage2 = createImageInternal('https://example.com/hero-side.png');

      const characterImages = storage.characterImages.get(character.id)!;
      characterImages.add(refImage1.id);
      characterImages.add(refImage2.id);

      // Retrieve images
      const imageIds = Array.from(characterImages);
      expect(imageIds).toContain(refImage1.id);
      expect(imageIds).toContain(refImage2.id);

      // Retrieve actual image objects
      const images = imageIds
        .map(id => storage.images.get(id))
        .filter(img => img !== undefined);

      expect(images.length).toBe(2);
      expect(images.map(img => img!.url)).toContain('https://example.com/hero-front.png');
      expect(images.map(img => img!.url)).toContain('https://example.com/hero-side.png');
    });
  });
});
