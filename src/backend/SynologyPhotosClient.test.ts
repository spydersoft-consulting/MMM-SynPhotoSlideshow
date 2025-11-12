/**
 * SynologyPhotosClient.test.ts
 *
 * Unit tests for SynologyPhotosClient - Public API only
 */

// Mock the logger and axios
jest.mock('./Logger');
import Log from './Logger';

jest.mock('axios');
import axios from 'axios';

import SynologyPhotosClient from './SynologyPhotosClient';
import type { ModuleConfig } from '../types';

describe('SynologyPhotosClient', () => {
  let client: SynologyPhotosClient;
  let mockConfig: Partial<ModuleConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      synologyUrl: 'https://nas.example.com',
      synologyAccount: 'testuser',
      synologyPassword: 'testpass',
      synologyAlbumName: 'TestAlbum',
      synologyTagNames: ['vacation', 'family'],
      synologyMaxPhotos: 500
    };
  });

  describe('constructor', () => {
    test('should create instance successfully', () => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client).toBeInstanceOf(SynologyPhotosClient);
    });

    test('should handle config with share token', () => {
      mockConfig.synologyShareToken = 'shared123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client).toBeInstanceOf(SynologyPhotosClient);
    });

    test('should handle minimal config', () => {
      delete mockConfig.synologyMaxPhotos;
      delete mockConfig.synologyTagNames;
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client).toBeInstanceOf(SynologyPhotosClient);
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should skip authentication when using shared album', async () => {
      mockConfig.synologyShareToken = 'shared123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      const result = await client.authenticate();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
      expect(Log.info).toHaveBeenCalledWith(
        'Using shared album token, skipping authentication'
      );
    });

    test('should authenticate successfully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { sid: 'test-session-id' }
        }
      });

      const result = await client.authenticate();

      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/auth.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.API.Auth',
            version: '3',
            method: 'login',
            account: 'testuser',
            passwd: 'testpass'
          })
        })
      );
      expect(Log.info).toHaveBeenCalledWith(
        'Successfully authenticated with Synology'
      );
    });

    test('should return false when authentication fails', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: { code: 400 }
        }
      });

      const result = await client.authenticate();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('authentication failed')
      );
    });

    test('should handle network errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.authenticate();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        'Synology authentication error: Network error'
      );
    });
  });

  describe('findAlbum', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should skip album search when using shared album', async () => {
      mockConfig.synologyShareToken = 'shared123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should find specific album successfully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'OtherAlbum' },
              { id: 2, name: 'TestAlbum' }
            ]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith('Found album: TestAlbum');
    });

    test('should handle case-insensitive matching', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [{ id: 2, name: 'testalbum' }]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(true);
    });

    test('should return false when album not found', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [{ id: 1, name: 'OtherAlbum' }]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(false);
      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });

    test('should handle API errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.findAlbum();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalled();
    });
  });

  describe('findTags', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should return true when no tags specified', async () => {
      mockConfig.synologyTagNames = [];
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should find tags successfully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'vacation' },
              { id: 2, name: 'family' }
            ]
          }
        }
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('Found'));
    });

    test('should handle case-insensitive tag matching', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'VACATION' },
              { id: 2, name: 'Family' }
            ]
          }
        }
      });

      const result = await client.findTags();

      expect(result).toBe(true);
    });

    test('should return false when no matching tags found', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [{ id: 1, name: 'unrelated' }]
          }
        }
      });

      const result = await client.findTags();

      expect(result).toBe(false);
      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining('No matching tags')
      );
    });

    test('should handle API errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.findTags();

      expect(result).toBe(false);
    });
  });

  describe('fetchPhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should fetch photos successfully', async () => {
      // Mock successful API responses
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              {
                id: 1,
                type: 'photo',
                filename: 'photo1.jpg',
                additional: { thumbnail: { cache_key: 'key1' } }
              }
            ]
          }
        }
      });

      const result = await client.fetchPhotos();

      expect(Array.isArray(result)).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('Fetched'));
    });

    test('should return empty array on error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const result = await client.fetchPhotos();

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalled();
    });

    test('should handle empty photo list', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { list: [] }
        }
      });

      const result = await client.fetchPhotos();

      expect(result).toEqual([]);
    });
  });

  describe('downloadPhoto', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should download photo successfully', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockBuffer
      });

      const result = await client.downloadPhoto('http://example.com/photo.jpg');

      expect(axios.get).toHaveBeenCalledWith(
        'http://example.com/photo.jpg',
        expect.objectContaining({
          responseType: 'arraybuffer',
          timeout: 30000
        })
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    test('should return null on error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Download failed'));

      const result = await client.downloadPhoto('http://example.com/photo.jpg');

      expect(result).toBeNull();
      expect(Log.error).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should skip logout when using shared album', async () => {
      mockConfig.synologyShareToken = 'shared123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      await client.logout();

      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should logout successfully after authentication', async () => {
      // First authenticate
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      // Then logout
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true }
      });

      await client.logout();

      expect(Log.info).toHaveBeenCalledWith('Logged out from Synology');
    });

    test('should handle logout errors gracefully', async () => {
      // Authenticate first
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      // Logout with error
      (axios.get as jest.Mock).mockRejectedValueOnce(
        new Error('Logout failed')
      );

      await client.logout();

      expect(Log.error).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete authentication workflow', async () => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { sid: 'session123' }
        }
      });

      const authResult = await client.authenticate();

      expect(authResult).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        'Successfully authenticated with Synology'
      );
    });

    test('should handle shared album workflow', async () => {
      mockConfig.synologyShareToken = 'token123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      const authResult = await client.authenticate();
      const albumResult = await client.findAlbum();
      const tagResult = await client.findTags();

      expect(authResult).toBe(true);
      expect(albumResult).toBe(true);
      // Tags should still need to be found even with shared album
      expect(tagResult).toBe(false); // Will fail without mocking API response
    });

    test('should handle complete photo fetch workflow', async () => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      // Mock all API calls
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              {
                id: 1,
                type: 'photo',
                filename: 'photo.jpg',
                additional: { thumbnail: { cache_key: 'k1' } }
              }
            ]
          }
        }
      });

      await client.authenticate();
      await client.findAlbum();
      const photos = await client.fetchPhotos();

      expect(photos.length).toBeGreaterThan(0);
    });
  });
});
