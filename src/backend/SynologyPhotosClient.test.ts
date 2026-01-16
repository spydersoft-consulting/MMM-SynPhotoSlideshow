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
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Found album "TestAlbum"')
      );
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
      expect(Log.warn).toHaveBeenCalled();
    });

    test('should find albums in both personal and shared spaces', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'TestAlbum' }]
            }
          }
        });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.Foto.Browse.Album'
          })
        })
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.FotoTeam.Browse.Album'
          })
        })
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('personal space')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('shared space')
      );
    });

    test('should find albums only in personal space', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: []
            }
          }
        });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('personal space')
      );
    });

    test('should find albums only in shared space', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: []
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'TestAlbum' }]
            }
          }
        });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('shared space')
      );
    });

    test('should find all albums when no album name specified', async () => {
      delete mockConfig.synologyAlbumName;
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                { id: 1, name: 'Album1' },
                { id: 2, name: 'Album2' }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 3, name: 'Album3' }]
            }
          }
        });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 album(s) in personal space')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 album(s) in shared space')
      );
    });

    test('should handle partial space failures gracefully', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockRejectedValueOnce(new Error('Shared space error'));

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching albums from shared space')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('personal space')
      );
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
      expect(Log.warn).toHaveBeenCalled();
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

    test('should fetch photos from albums in both personal and shared spaces', async () => {
      // Mock authentication
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      // Mock findAlbum to populate albumIds
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'TestAlbum' }]
            }
          }
        });

      await client.findAlbum();

      // Mock fetchPhotos - should query both spaces
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 1,
                  type: 'photo',
                  filename: 'personal.jpg',
                  additional: { thumbnail: { cache_key: 'key1' } }
                }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 2,
                  type: 'photo',
                  filename: 'shared.jpg',
                  additional: { thumbnail: { cache_key: 'key2' } }
                }
              ]
            }
          }
        });

      const result = await client.fetchPhotos();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        path: 'personal.jpg',
        synologyId: 1,
        spaceId: 0
      });
      expect(result[1]).toMatchObject({
        path: 'shared.jpg',
        synologyId: 2,
        spaceId: 1
      });
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 1 photos from album 10 in space 0')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 1 photos from album 20 in space 1')
      );
    });

    test('should use correct API for personal space photos', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { list: [] }
          }
        });

      await client.findAlbum();

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            list: [
              {
                id: 1,
                type: 'photo',
                filename: 'photo.jpg',
                additional: { thumbnail: { cache_key: 'key1' } }
              }
            ]
          }
        }
      });

      await client.fetchPhotos();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.Foto.Browse.Item',
            album_id: 10,
            space_id: 0
          })
        })
      );
    });

    test('should use correct API for shared space photos', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { list: [] }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'TestAlbum' }]
            }
          }
        });

      await client.findAlbum();

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            list: [
              {
                id: 2,
                type: 'photo',
                filename: 'shared.jpg',
                additional: { thumbnail: { cache_key: 'key2' } }
              }
            ]
          }
        }
      });

      await client.fetchPhotos();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.FotoTeam.Browse.Item',
            album_id: 20
          })
        })
      );
      // Should NOT include space_id for shared space (space 1)
      const lastCall = (axios.get as jest.Mock).mock.calls[
        (axios.get as jest.Mock).mock.calls.length - 1
      ];
      expect(lastCall[1].params).not.toHaveProperty('space_id');
    });

    test('should fetch from all photos when no albums specified', async () => {
      delete mockConfig.synologyAlbumName;
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      // Mock findAlbum - no albums found
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { list: [] }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { list: [] }
          }
        });

      await client.findAlbum();

      // Mock fetchAllPhotos from both spaces
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 1,
                  type: 'photo',
                  filename: 'all1.jpg',
                  additional: { thumbnail: { cache_key: 'k1' } }
                }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 2,
                  type: 'photo',
                  filename: 'all2.jpg',
                  additional: { thumbnail: { cache_key: 'k2' } }
                }
              ]
            }
          }
        });

      const result = await client.fetchPhotos();

      expect(result).toHaveLength(2);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 1 photos from space 0')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 1 photos from space 1')
      );
    });

    test('should include spaceId in photo URLs for correct API selection', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { sid: 'test-session' }
        }
      });

      await client.authenticate();

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 10, name: 'TestAlbum' }]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'TestAlbum' }]
            }
          }
        });

      await client.findAlbum();

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 1,
                  type: 'photo',
                  filename: 'personal.jpg',
                  additional: { thumbnail: { cache_key: 'key1' } }
                }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              list: [
                {
                  id: 2,
                  type: 'photo',
                  filename: 'shared.jpg',
                  additional: { thumbnail: { cache_key: 'key2' } }
                }
              ]
            }
          }
        });

      const result = await client.fetchPhotos();

      // Personal space photo should use SYNO.Foto.Thumbnail
      expect(result[0].url).toContain('SYNO.Foto.Thumbnail');
      expect(result[0].url).toContain('space_id=0');

      // Shared space photo should use SYNO.FotoTeam.Thumbnail
      expect(result[1].url).toContain('SYNO.FotoTeam.Thumbnail');
      expect(result[1].url).not.toContain('space_id');
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
