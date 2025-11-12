/**
 * SynologyPhotosClient.test.ts
 *
 * Unit tests for SynologyPhotosClient
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
    test('should initialize with config values', () => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.baseUrl).toBe('https://nas.example.com');
      expect(client.account).toBe('testuser');
      expect(client.password).toBe('testpass');
      expect(client.albumName).toBe('TestAlbum');
      expect(client.tagNames).toEqual(['vacation', 'family']);
      expect(client.maxPhotosToFetch).toBe(500);
      expect(client.useSharedAlbum).toBe(false);
      expect(client.sid).toBeNull();
      expect(client.folderIds).toEqual([]);
      expect(client.tagIds).toEqual({});
    });

    test('should use share token when provided', () => {
      mockConfig.synologyShareToken = 'shared123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.shareToken).toBe('shared123');
      expect(client.useSharedAlbum).toBe(true);
    });

    test('should default maxPhotosToFetch to 1000', () => {
      delete mockConfig.synologyMaxPhotos;
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.maxPhotosToFetch).toBe(1000);
    });

    test('should default tagNames to empty array', () => {
      delete mockConfig.synologyTagNames;
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.tagNames).toEqual([]);
    });

    test('should set correct API paths', () => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.authApiPath).toBe('/webapi/auth.cgi');
      expect(client.photosApiPath).toBe('/webapi/entry.cgi');
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should skip authentication when using shared album', async () => {
      client.useSharedAlbum = true;

      const result = await client.authenticate();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
      expect(Log.info).toHaveBeenCalledWith(
        'Using shared album token, skipping authentication'
      );
    });

    test('should authenticate successfully and store session ID', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { sid: 'test-session-id' }
        }
      });

      const result = await client.authenticate();

      expect(result).toBe(true);
      expect(client.sid).toBe('test-session-id');
      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/auth.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.API.Auth',
            version: '3',
            method: 'login',
            account: 'testuser',
            passwd: 'testpass',
            session: 'FileStation',
            format: 'sid'
          }),
          timeout: 10000
        })
      );
      expect(Log.info).toHaveBeenCalledWith(
        'Successfully authenticated with Synology'
      );
    });

    test('should return false when authentication fails', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: false,
          error: { code: 400 }
        }
      });

      const result = await client.authenticate();

      expect(result).toBe(false);
      expect(client.sid).toBeNull();
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('authentication failed')
      );
    });

    test('should handle authentication network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

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
      client.sid = 'test-session-id';
    });

    test('should skip album search when using shared album', async () => {
      client.useSharedAlbum = true;

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
      expect(Log.info).toHaveBeenCalledWith(
        'Using shared album, skipping album search'
      );
    });

    test('should find specific album by name', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'OtherAlbum' },
              { id: 2, name: 'TestAlbum' },
              { id: 3, name: 'AnotherAlbum' }
            ]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(client.folderIds).toEqual([2]);
      expect(Log.info).toHaveBeenCalledWith('Found album: TestAlbum');
    });

    test('should be case-insensitive when matching album name', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [{ id: 2, name: 'testalbum' }]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(client.folderIds).toEqual([2]);
    });

    test('should return all albums when no album name specified', async () => {
      client.albumName = null;
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'Album1' },
              { id: 2, name: 'Album2' },
              { id: 3, name: 'Album3' }
            ]
          }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(true);
      expect(client.folderIds).toEqual([1, 2, 3]);
      expect(Log.info).toHaveBeenCalledWith(
        'Found 3 albums, will fetch from all'
      );
    });

    test('should return false when album not found', async () => {
      axios.get.mockResolvedValue({
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
        expect.stringContaining('Album "TestAlbum" not found')
      );
    });

    test('should handle API failure', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: false,
          error: { code: 500 }
        }
      });

      const result = await client.findAlbum();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list albums')
      );
    });

    test('should handle network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await client.findAlbum();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        'Error listing albums: Network error'
      );
    });
  });

  describe('findTags', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.sid = 'test-session-id';
    });

    test('should return true when no tags specified', async () => {
      client.tagNames = [];

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should find tags in shared album', async () => {
      client.useSharedAlbum = true;
      client.shareToken = 'token123';
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'vacation' },
              { id: 2, name: 'work' },
              { id: 3, name: 'family' }
            ]
          }
        }
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(client.tagIds.shared).toEqual([1, 3]);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 matching tags')
      );
    });

    test('should find tags in personal space', async () => {
      axios.get.mockImplementation((url, config) => {
        if (config.params.api === 'SYNO.Foto.Browse.GeneralTag') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                list: [
                  { id: 10, name: 'vacation' },
                  { id: 11, name: 'family' }
                ]
              }
            }
          });
        }
        return Promise.resolve({
          data: {
            success: true,
            data: { list: [] }
          }
        });
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(client.tagIds[0]).toEqual([10, 11]);
    });

    test('should find tags in shared space', async () => {
      axios.get.mockImplementation((url, config) => {
        if (config.params.api === 'SYNO.FotoTeam.Browse.GeneralTag') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                list: [{ id: 20, name: 'vacation' }]
              }
            }
          });
        }
        return Promise.resolve({
          data: {
            success: true,
            data: { list: [] }
          }
        });
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(client.tagIds[1]).toEqual([20]);
    });

    test('should be case-insensitive when matching tags', async () => {
      client.useSharedAlbum = true;
      client.shareToken = 'token123';
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            list: [
              { id: 1, name: 'VACATION' },
              { id: 3, name: 'Family' }
            ]
          }
        }
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(client.tagIds.shared).toEqual([1, 3]);
    });

    test('should return false when no matching tags found', async () => {
      client.useSharedAlbum = true;
      client.shareToken = 'token123';
      axios.get.mockResolvedValue({
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
        expect.stringContaining('No matching tags found')
      );
    });

    test('should handle API errors gracefully', async () => {
      axios.get.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const result = await client.findTags();

      expect(result).toBe(false);
      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching tags from')
      );
    });

    test('should continue if one space fails', async () => {
      axios.get.mockImplementation((url, config) => {
        if (config.params.api === 'SYNO.Foto.Browse.GeneralTag') {
          return Promise.reject(new Error('Personal space error'));
        }
        return Promise.resolve({
          data: {
            success: true,
            data: {
              list: [{ id: 20, name: 'vacation' }]
            }
          }
        });
      });

      const result = await client.findTags();

      expect(result).toBe(true);
      expect(client.tagIds[1]).toEqual([20]);
      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching tags from personal space')
      );
    });
  });

  describe('fetchPhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.sid = 'test-session-id';
    });

    test('should fetch photos by tags when tagIds present', async () => {
      client.tagIds = { 0: [10, 11] };
      const mockPhotos1 = [{ id: 1, type: 'photo', filename: 'photo1.jpg' }];
      const mockPhotos2 = [{ id: 2, type: 'photo', filename: 'photo2.jpg' }];

      jest
        .spyOn(client, 'fetchPhotosByTagInSpace')
        .mockResolvedValueOnce(mockPhotos1)
        .mockResolvedValueOnce(mockPhotos2);
      jest.spyOn(client, 'removeDuplicatePhotos').mockImplementation((p) => p);

      const result = await client.fetchPhotos();

      expect(client.fetchPhotosByTagInSpace).toHaveBeenCalledTimes(2);
      expect(client.fetchPhotosByTagInSpace).toHaveBeenCalledWith(10, 0);
      expect(client.fetchPhotosByTagInSpace).toHaveBeenCalledWith(11, 0);
      expect(result).toHaveLength(2);
    });

    test('should fetch shared album photos when using shared album without tags', async () => {
      client.useSharedAlbum = true;
      const mockPhotos = [{ id: 1, type: 'photo', filename: 'photo1.jpg' }];

      jest
        .spyOn(client, 'fetchSharedAlbumPhotos')
        .mockResolvedValue(mockPhotos);

      const result = await client.fetchPhotos();

      expect(client.fetchSharedAlbumPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
    });

    test('should fetch all photos when no album specified', async () => {
      client.folderIds = [];
      const mockPhotos = [{ id: 1, type: 'photo', filename: 'photo1.jpg' }];

      jest.spyOn(client, 'fetchAllPhotos').mockResolvedValue(mockPhotos);

      const result = await client.fetchPhotos();

      expect(client.fetchAllPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
    });

    test('should fetch photos from specific albums in parallel', async () => {
      client.folderIds = [1, 2, 3];
      const mockPhotos1 = [{ id: 1, type: 'photo', filename: 'photo1.jpg' }];
      const mockPhotos2 = [{ id: 2, type: 'photo', filename: 'photo2.jpg' }];
      const mockPhotos3 = [{ id: 3, type: 'photo', filename: 'photo3.jpg' }];

      jest
        .spyOn(client, 'fetchAlbumPhotos')
        .mockResolvedValueOnce(mockPhotos1)
        .mockResolvedValueOnce(mockPhotos2)
        .mockResolvedValueOnce(mockPhotos3);

      const result = await client.fetchPhotos();

      expect(client.fetchAlbumPhotos).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    test('should remove duplicate photos when fetching by tags', async () => {
      client.tagIds = { 0: [10] };
      const mockPhotos = [
        { id: 1, type: 'photo', filename: 'photo1.jpg' },
        { id: 1, type: 'photo', filename: 'photo1.jpg' }
      ];

      jest
        .spyOn(client, 'fetchPhotosByTagInSpace')
        .mockResolvedValue(mockPhotos);
      jest
        .spyOn(client, 'removeDuplicatePhotos')
        .mockReturnValue([mockPhotos[0]]);

      const result = await client.fetchPhotos();

      expect(client.removeDuplicatePhotos).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    test('should handle errors and return empty array', async () => {
      client.folderIds = [];
      jest
        .spyOn(client, 'fetchAllPhotos')
        .mockRejectedValue(new Error('Fetch error'));

      const result = await client.fetchPhotos();

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalledWith(
        'Error fetching photos: Fetch error'
      );
    });

    test('should log total photos fetched', async () => {
      client.folderIds = [];
      jest
        .spyOn(client, 'fetchAllPhotos')
        .mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await client.fetchPhotos();

      expect(Log.info).toHaveBeenCalledWith(
        'Fetched 2 photos from Synology Photos'
      );
    });
  });

  describe('fetchSharedAlbumPhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.useSharedAlbum = true;
      client.shareToken = 'token123';
    });

    test('should fetch photos from shared album successfully', async () => {
      const mockPhotoList = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: mockPhotoList }
        }
      });
      jest
        .spyOn(client, 'processPhotoList')
        .mockReturnValue([{ id: 1, path: 'photo1.jpg' }]);

      const result = await client.fetchSharedAlbumPhotos();

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/entry.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.Foto.Browse.Item',
            method: 'list',
            passphrase: 'token123',
            limit: 500
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    test('should return empty array on API failure', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: false,
          error: { code: 404 }
        }
      });

      const result = await client.fetchSharedAlbumPhotos();

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch shared album photos')
      );
    });

    test('should handle network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await client.fetchSharedAlbumPhotos();

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalledWith(
        'Error fetching shared album photos: Network error'
      );
    });
  });

  describe('fetchAllPhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.sid = 'test-session-id';
    });

    test('should fetch all photos successfully', async () => {
      const mockPhotoList = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: mockPhotoList }
        }
      });
      jest
        .spyOn(client, 'processPhotoList')
        .mockReturnValue([{ id: 1, path: 'photo1.jpg' }]);

      const result = await client.fetchAllPhotos();

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/entry.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.Foto.Browse.Item',
            method: 'list',
            _sid: 'test-session-id'
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    test('should return empty array on failure', async () => {
      axios.get.mockResolvedValue({
        data: { success: false }
      });

      const result = await client.fetchAllPhotos();

      expect(result).toEqual([]);
    });
  });

  describe('fetchAlbumPhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.sid = 'test-session-id';
    });

    test('should fetch photos from specific album', async () => {
      const mockPhotoList = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: mockPhotoList }
        }
      });
      jest
        .spyOn(client, 'processPhotoList')
        .mockReturnValue([{ id: 1, path: 'photo1.jpg' }]);

      const result = await client.fetchAlbumPhotos(42);

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/entry.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            album_id: 42,
            _sid: 'test-session-id'
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    test('should handle errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await client.fetchAlbumPhotos(42);

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalledWith(
        'Error fetching album photos: Network error'
      );
    });
  });

  describe('fetchPhotosByTagInSpace', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      client.sid = 'test-session-id';
    });

    test('should fetch photos from personal space with tag', async () => {
      const mockPhotoList = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: mockPhotoList }
        }
      });
      jest
        .spyOn(client, 'processPhotoList')
        .mockReturnValue([{ id: 1, path: 'photo1.jpg' }]);

      const result = await client.fetchPhotosByTagInSpace(10, 0);

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/entry.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.Foto.Browse.Item',
            general_tag_id: 10,
            space_id: 0,
            _sid: 'test-session-id'
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    test('should fetch photos from shared space with different API', async () => {
      const mockPhotoList = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: mockPhotoList }
        }
      });
      jest
        .spyOn(client, 'processPhotoList')
        .mockReturnValue([{ id: 1, path: 'photo1.jpg' }]);

      const result = await client.fetchPhotosByTagInSpace(20, 1);

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/entry.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.FotoTeam.Browse.Item',
            general_tag_id: 20,
            _sid: 'test-session-id'
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    test('should use passphrase for shared album', async () => {
      client.useSharedAlbum = true;
      client.shareToken = 'token123';
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { list: [] }
        }
      });
      jest.spyOn(client, 'processPhotoList').mockReturnValue([]);

      await client.fetchPhotosByTagInSpace(10, null);

      expect(axios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({
            passphrase: 'token123'
          })
        })
      );
    });

    test('should handle errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await client.fetchPhotosByTagInSpace(10, 0);

      expect(result).toEqual([]);
      expect(Log.error).toHaveBeenCalledWith(
        'Error fetching photos by tag 10 from space 0: Network error'
      );
    });

    test('should return empty array on API failure', async () => {
      axios.get.mockResolvedValue({
        data: { success: false }
      });

      const result = await client.fetchPhotosByTagInSpace(10, 0);

      expect(result).toEqual([]);
    });
  });

  describe('removeDuplicatePhotos', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should remove duplicates by synologyId', () => {
      const photos = [
        { id: '0_1', synologyId: 1, path: 'photo1.jpg' },
        { id: '1_1', synologyId: 1, path: 'photo1.jpg' },
        { id: '0_2', synologyId: 2, path: 'photo2.jpg' }
      ];

      const result = client.removeDuplicatePhotos(photos);

      expect(result).toHaveLength(2);
      expect(result[0].synologyId).toBe(1);
      expect(result[1].synologyId).toBe(2);
    });

    test('should use id as fallback when synologyId not present', () => {
      const photos = [
        { id: 1, path: 'photo1.jpg' },
        { id: 1, path: 'photo1.jpg' },
        { id: 2, path: 'photo2.jpg' }
      ];

      const result = client.removeDuplicatePhotos(photos);

      expect(result).toHaveLength(2);
    });

    test('should preserve first occurrence', () => {
      const photos = [
        { id: 1, synologyId: 1, path: 'first.jpg' },
        { id: 2, synologyId: 1, path: 'second.jpg' }
      ];

      const result = client.removeDuplicatePhotos(photos);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('first.jpg');
    });

    test('should handle empty array', () => {
      const result = client.removeDuplicatePhotos([]);

      expect(result).toEqual([]);
    });
  });

  describe('processPhotoList', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
      jest
        .spyOn(client, 'getPhotoUrl')
        .mockReturnValue('http://example.com/photo.jpg');
    });

    test('should process photo list correctly', () => {
      const photos = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          time: 1609459200,
          indexed_time: 1609545600,
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];

      const result = client.processPhotoList(photos);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: 'photo1.jpg',
        url: 'http://example.com/photo.jpg',
        id: 1,
        synologyId: 1,
        spaceId: null,
        created: 1609459200000,
        modified: 1609545600000,
        isSynology: true
      });
    });

    test('should include live photos', () => {
      const photos = [
        {
          id: 1,
          type: 'live_photo',
          filename: 'live1.jpg',
          time: 1609459200,
          indexed_time: 1609545600,
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];

      const result = client.processPhotoList(photos);

      expect(result).toHaveLength(1);
    });

    test('should exclude videos', () => {
      const photos = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        },
        {
          id: 2,
          type: 'video',
          filename: 'video1.mp4',
          additional: { thumbnail: { cache_key: 'key2' } }
        }
      ];

      const result = client.processPhotoList(photos);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('photo1.jpg');
    });

    test('should use photo ID as fallback filename', () => {
      const photos = [
        {
          id: 123,
          type: 'photo',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];

      const result = client.processPhotoList(photos);

      expect(result[0].path).toBe('photo_123');
    });

    test('should include spaceId in unique ID when provided', () => {
      const photos = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];

      const result = client.processPhotoList(photos, 1);

      expect(result[0].id).toBe('1_1');
      expect(result[0].spaceId).toBe(1);
    });

    test('should use current time as fallback for timestamps', () => {
      const photos = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo1.jpg',
          additional: { thumbnail: { cache_key: 'key1' } }
        }
      ];

      const now = Date.now();
      const result = client.processPhotoList(photos);

      expect(result[0].created).toBeGreaterThanOrEqual(now - 1000);
      expect(result[0].modified).toBeGreaterThanOrEqual(now - 1000);
    });

    test('should handle empty list', () => {
      const result = client.processPhotoList([]);

      expect(result).toEqual([]);
    });
  });

  describe('getPhotoUrl', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should generate URL for shared album', () => {
      client.useSharedAlbum = true;
      client.shareToken = 'token123';

      const url = client.getPhotoUrl(42, 'cache123', null);

      expect(url).toContain('SYNO.Foto.Thumbnail');
      expect(url).toContain('id=42');
      expect(url).toContain('cache_key="cache123"');
      expect(url).toContain('passphrase=token123');
      expect(url).toContain('size="xl"');
    });

    test('should generate URL for personal space', () => {
      client.sid = 'session123';

      const url = client.getPhotoUrl(42, 'cache123', 0);

      expect(url).toContain('SYNO.Foto.Thumbnail');
      expect(url).toContain('id=42');
      expect(url).toContain('_sid=session123');
      expect(url).toContain('space_id=0');
    });

    test('should generate URL for shared space with FotoTeam API', () => {
      client.sid = 'session123';

      const url = client.getPhotoUrl(42, 'cache123', 1);

      expect(url).toContain('SYNO.FotoTeam.Thumbnail');
      expect(url).toContain('id=42');
      expect(url).toContain('_sid=session123');
      expect(url).not.toContain('space_id');
    });

    test('should not include space_id for shared space', () => {
      client.sid = 'session123';

      const url = client.getPhotoUrl(42, 'cache123', 1);

      expect(url).not.toContain('space_id=1');
    });
  });

  describe('downloadPhoto', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should download photo successfully', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      axios.get.mockResolvedValue({
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
      axios.get.mockRejectedValue(new Error('Download failed'));

      const result = await client.downloadPhoto('http://example.com/photo.jpg');

      expect(result).toBeNull();
      expect(Log.error).toHaveBeenCalledWith(
        'Error downloading photo: Download failed'
      );
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should skip logout when using shared album', async () => {
      client.useSharedAlbum = true;

      await client.logout();

      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should skip logout when no session ID', async () => {
      client.sid = null;

      await client.logout();

      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should logout successfully', async () => {
      client.sid = 'session123';
      axios.get.mockResolvedValue({
        data: { success: true }
      });

      await client.logout();

      expect(axios.get).toHaveBeenCalledWith(
        'https://nas.example.com/webapi/auth.cgi',
        expect.objectContaining({
          params: expect.objectContaining({
            api: 'SYNO.API.Auth',
            method: 'logout',
            _sid: 'session123'
          })
        })
      );
      expect(Log.info).toHaveBeenCalledWith('Logged out from Synology');
    });

    test('should handle logout errors gracefully', async () => {
      client.sid = 'session123';
      axios.get.mockRejectedValue(new Error('Logout failed'));

      await client.logout();

      expect(Log.error).toHaveBeenCalledWith(
        'Error logging out: Logout failed'
      );
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);
    });

    test('should handle full workflow with authentication', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { sid: 'session123' }
        }
      });

      await client.authenticate();

      expect(client.sid).toBe('session123');
      expect(Log.info).toHaveBeenCalledWith(
        'Successfully authenticated with Synology'
      );
    });

    test('should handle shared album workflow', async () => {
      mockConfig.synologyShareToken = 'token123';
      client = new SynologyPhotosClient(mockConfig as ModuleConfig);

      expect(client.useSharedAlbum).toBe(true);

      const authResult = await client.authenticate();
      expect(authResult).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should handle multiple spaces with tags', () => {
      client.tagIds = {
        0: [10, 11],
        1: [20]
      };

      const spaces = Object.keys(client.tagIds);
      expect(spaces).toHaveLength(2);
    });

    test('should process mixed photo types correctly', () => {
      jest
        .spyOn(client, 'getPhotoUrl')
        .mockReturnValue('http://example.com/photo.jpg');

      const photos = [
        {
          id: 1,
          type: 'photo',
          filename: 'photo.jpg',
          additional: { thumbnail: { cache_key: 'k1' } }
        },
        {
          id: 2,
          type: 'video',
          filename: 'video.mp4',
          additional: { thumbnail: { cache_key: 'k2' } }
        },
        {
          id: 3,
          type: 'live_photo',
          filename: 'live.jpg',
          additional: { thumbnail: { cache_key: 'k3' } }
        }
      ];

      const result = client.processPhotoList(photos);

      expect(result).toHaveLength(2);
      expect(result[0].synologyId).toBe(1);
      expect(result[1].synologyId).toBe(3);
    });
  });
});
