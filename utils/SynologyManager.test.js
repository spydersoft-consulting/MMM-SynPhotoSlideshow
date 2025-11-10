/**
 * SynologyManager.test.js
 *
 * Unit tests for SynologyManager
 */

// Mock the Logger and SynologyPhotosClient
jest.mock('./Logger.js');
jest.mock('./SynologyPhotosClient.js');

const SynologyManager = require('./SynologyManager');
const Log = require('./Logger.js');
const SynologyPhotosClient = require('./SynologyPhotosClient.js');

describe('SynologyManager', () => {
  let manager;
  let mockClient;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock client instance
    mockClient = {
      authenticate: jest.fn(),
      findTags: jest.fn(),
      findAlbum: jest.fn(),
      fetchPhotos: jest.fn()
    };

    // Mock SynologyPhotosClient constructor
    SynologyPhotosClient.mockImplementation(() => mockClient);

    mockConfig = {
      synologyUrl: 'https://photos.example.com',
      synologyUsername: 'testuser',
      synologyPassword: 'testpass',
      synologyAlbumName: 'TestAlbum',
      synologyTagNames: []
    };

    manager = new SynologyManager();
  });

  describe('constructor', () => {
    it('should initialize with null client', () => {
      expect(manager.client).toBeNull();
    });

    it('should initialize with empty photos array', () => {
      expect(manager.photos).toEqual([]);
    });
  });

  describe('fetchPhotos', () => {
    describe('authentication', () => {
      it('should initialize Synology Photos client', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);

        await manager.fetchPhotos(mockConfig);

        expect(Log.info).toHaveBeenCalledWith('Initializing Synology Photos client...');
        expect(SynologyPhotosClient).toHaveBeenCalledWith(mockConfig);
        expect(manager.client).toBe(mockClient);
      });

      it('should authenticate with credentials', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.authenticate).toHaveBeenCalled();
      });

      it('should return empty array if authentication fails without share token', async () => {
        mockClient.authenticate.mockResolvedValue(false);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Failed to authenticate with Synology');
        expect(result).toEqual([]);
      });

      it('should continue if authentication fails but share token provided', async () => {
        mockClient.authenticate.mockResolvedValue(false);
        mockClient.fetchPhotos.mockResolvedValue([
          {id: 1,
            filename: 'photo1.jpg'}
        ]);
        mockConfig.synologyShareToken = 'shared123';

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).not.toHaveBeenCalledWith('Failed to authenticate with Synology');
        expect(mockClient.fetchPhotos).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });
    });

    describe('tag handling', () => {
      it('should find tags when tagNames specified', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findTags.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        mockConfig.synologyTagNames = ['vacation', 'family'];

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findTags).toHaveBeenCalled();
      });

      it('should return empty array if finding tags fails', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findTags.mockResolvedValue(false);
        mockConfig.synologyTagNames = ['vacation'];

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Failed to find Synology tags');
        expect(result).toEqual([]);
      });

      it('should not call findTags when tagNames is empty array', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        mockConfig.synologyTagNames = [];

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findTags).not.toHaveBeenCalled();
      });

      it('should not call findTags when tagNames is undefined', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        delete mockConfig.synologyTagNames;

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findTags).not.toHaveBeenCalled();
      });
    });

    describe('album handling', () => {
      it('should find album when albumName specified and no share token', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        mockConfig.synologyAlbumName = 'TestAlbum';

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findAlbum).toHaveBeenCalled();
      });

      it('should return empty array if finding album fails', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(false);
        mockConfig.synologyAlbumName = 'TestAlbum';

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Failed to find Synology album');
        expect(result).toEqual([]);
      });

      it('should not find album when share token is provided', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        mockConfig.synologyShareToken = 'shared123';
        mockConfig.synologyAlbumName = 'TestAlbum';

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findAlbum).not.toHaveBeenCalled();
      });

      it('should not find album when tags are specified', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findTags.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        mockConfig.synologyTagNames = ['vacation'];
        mockConfig.synologyAlbumName = 'TestAlbum';

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findAlbum).not.toHaveBeenCalled();
        expect(mockClient.findTags).toHaveBeenCalled();
      });

      it('should not find album when albumName is not specified', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);
        delete mockConfig.synologyAlbumName;

        await manager.fetchPhotos(mockConfig);

        expect(mockClient.findAlbum).not.toHaveBeenCalled();
      });
    });

    describe('photo fetching', () => {
      it('should fetch photos successfully', async () => {
        const mockPhotos = [
          {id: 1,
            filename: 'photo1.jpg'},
          {id: 2,
            filename: 'photo2.jpg'}
        ];
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue(mockPhotos);

        const result = await manager.fetchPhotos(mockConfig);

        expect(mockClient.fetchPhotos).toHaveBeenCalled();
        expect(result).toEqual(mockPhotos);
        expect(Log.info).toHaveBeenCalledWith('Retrieved 2 photos from Synology');
      });

      it('should store fetched photos in manager', async () => {
        const mockPhotos = [
          {id: 1,
            filename: 'photo1.jpg'}
        ];
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue(mockPhotos);

        await manager.fetchPhotos(mockConfig);

        expect(manager.photos).toEqual(mockPhotos);
      });

      it('should return empty array when no photos found', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue([]);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.warn).toHaveBeenCalledWith('No photos found in Synology');
        expect(result).toEqual([]);
      });

      it('should return empty array when fetchPhotos returns null or undefined', async () => {
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue(null);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.warn).toHaveBeenCalledWith('No photos found in Synology');
        expect(result).toEqual([]);
      });

      it('should handle large number of photos', async () => {
        const mockPhotos = Array.from({length: 1000}, (_, i) => ({
          id: i + 1,
          filename: `photo${i + 1}.jpg`
        }));
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockResolvedValue(mockPhotos);

        const result = await manager.fetchPhotos(mockConfig);

        expect(result).toHaveLength(1000);
        expect(Log.info).toHaveBeenCalledWith('Retrieved 1000 photos from Synology');
      });
    });

    describe('error handling', () => {
      it('should catch and log authentication errors', async () => {
        const error = new Error('Network error');
        mockClient.authenticate.mockRejectedValue(error);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Error fetching Synology photos: Network error');
        expect(result).toEqual([]);
      });

      it('should catch and log findTags errors', async () => {
        const error = new Error('Tag API error');
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findTags.mockRejectedValue(error);
        mockConfig.synologyTagNames = ['vacation'];

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Error fetching Synology photos: Tag API error');
        expect(result).toEqual([]);
      });

      it('should catch and log findAlbum errors', async () => {
        const error = new Error('Album API error');
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockRejectedValue(error);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Error fetching Synology photos: Album API error');
        expect(result).toEqual([]);
      });

      it('should catch and log fetchPhotos errors', async () => {
        const error = new Error('Fetch API error');
        mockClient.authenticate.mockResolvedValue(true);
        mockClient.findAlbum.mockResolvedValue(true);
        mockClient.fetchPhotos.mockRejectedValue(error);

        const result = await manager.fetchPhotos(mockConfig);

        expect(Log.error).toHaveBeenCalledWith('Error fetching Synology photos: Fetch API error');
        expect(result).toEqual([]);
      });

      it('should handle errors without message property', async () => {
        mockClient.authenticate.mockRejectedValue('String error');

        const result = await manager.fetchPhotos(mockConfig);

        expect(result).toEqual([]);
      });
    });
  });

  describe('getClient', () => {
    it('should return null when not initialized', () => {
      expect(manager.getClient()).toBeNull();
    });

    it('should return client instance after fetchPhotos', async () => {
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue([]);

      await manager.fetchPhotos(mockConfig);

      expect(manager.getClient()).toBe(mockClient);
    });
  });

  describe('getPhotos', () => {
    it('should return empty array when not initialized', () => {
      expect(manager.getPhotos()).toEqual([]);
    });

    it('should return cached photos after fetchPhotos', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'photo1.jpg'},
        {id: 2,
          filename: 'photo2.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);

      await manager.fetchPhotos(mockConfig);

      expect(manager.getPhotos()).toEqual(mockPhotos);
    });

    it('should return empty array after failed fetch', async () => {
      mockClient.authenticate.mockResolvedValue(false);

      await manager.fetchPhotos(mockConfig);

      expect(manager.getPhotos()).toEqual([]);
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it('should return true after successful fetchPhotos', async () => {
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue([]);

      await manager.fetchPhotos(mockConfig);

      expect(manager.isInitialized()).toBe(true);
    });

    it('should return true even if no photos found', async () => {
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue([]);

      await manager.fetchPhotos(mockConfig);

      expect(manager.isInitialized()).toBe(true);
    });

    it('should return true after authentication failure (client still initialized)', async () => {
      mockClient.authenticate.mockResolvedValue(false);

      await manager.fetchPhotos(mockConfig);

      // Client is initialized even if authentication fails
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with personal account and album', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'photo1.jpg'},
        {id: 2,
          filename: 'photo2.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);

      const result = await manager.fetchPhotos(mockConfig);

      expect(mockClient.authenticate).toHaveBeenCalled();
      expect(mockClient.findAlbum).toHaveBeenCalled();
      expect(mockClient.findTags).not.toHaveBeenCalled();
      expect(mockClient.fetchPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
      expect(manager.isInitialized()).toBe(true);
      expect(manager.getClient()).toBe(mockClient);
      expect(manager.getPhotos()).toEqual(mockPhotos);
    });

    it('should handle complete workflow with shared album', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'shared.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(false);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);
      mockConfig.synologyShareToken = 'shared123';

      const result = await manager.fetchPhotos(mockConfig);

      expect(mockClient.authenticate).toHaveBeenCalled();
      expect(mockClient.findAlbum).not.toHaveBeenCalled();
      expect(mockClient.findTags).not.toHaveBeenCalled();
      expect(mockClient.fetchPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
      expect(manager.isInitialized()).toBe(true);
    });

    it('should handle complete workflow with tags', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'tagged.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findTags.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);
      mockConfig.synologyTagNames = ['vacation', 'summer'];

      const result = await manager.fetchPhotos(mockConfig);

      expect(mockClient.authenticate).toHaveBeenCalled();
      expect(mockClient.findTags).toHaveBeenCalled();
      expect(mockClient.findAlbum).not.toHaveBeenCalled();
      expect(mockClient.fetchPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
    });

    it('should handle workflow with tags and album (tags take precedence)', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'photo.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findTags.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);
      mockConfig.synologyTagNames = ['vacation'];
      mockConfig.synologyAlbumName = 'TestAlbum';

      await manager.fetchPhotos(mockConfig);

      expect(mockClient.findTags).toHaveBeenCalled();
      expect(mockClient.findAlbum).not.toHaveBeenCalled();
    });

    it('should handle multiple fetchPhotos calls', async () => {
      const mockPhotos1 = [
        {id: 1,
          filename: 'photo1.jpg'}
      ];
      const mockPhotos2 = [
        {id: 2,
          filename: 'photo2.jpg'},
        {id: 3,
          filename: 'photo3.jpg'}
      ];

      mockClient.authenticate.mockResolvedValue(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValueOnce(mockPhotos1).mockResolvedValueOnce(mockPhotos2);

      const result1 = await manager.fetchPhotos(mockConfig);
      expect(result1).toEqual(mockPhotos1);
      expect(manager.getPhotos()).toEqual(mockPhotos1);

      const result2 = await manager.fetchPhotos(mockConfig);
      expect(result2).toEqual(mockPhotos2);
      expect(manager.getPhotos()).toEqual(mockPhotos2);
    });

    it('should handle recovery from failed fetch', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'photo.jpg'}
      ];

      // First call fails authentication
      mockClient.authenticate.mockResolvedValueOnce(false);
      const result1 = await manager.fetchPhotos(mockConfig);
      expect(result1).toEqual([]);
      // Client is still initialized even though auth failed
      expect(manager.isInitialized()).toBe(true);

      // Second call succeeds
      mockClient.authenticate.mockResolvedValueOnce(true);
      mockClient.findAlbum.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);
      const result2 = await manager.fetchPhotos(mockConfig);
      expect(result2).toEqual(mockPhotos);
      expect(manager.isInitialized()).toBe(true);
      expect(manager.getPhotos()).toEqual(mockPhotos);
    });

    it('should handle workflow without album or tags', async () => {
      const mockPhotos = [
        {id: 1,
          filename: 'photo.jpg'}
      ];
      mockClient.authenticate.mockResolvedValue(true);
      mockClient.fetchPhotos.mockResolvedValue(mockPhotos);
      delete mockConfig.synologyAlbumName;
      delete mockConfig.synologyTagNames;

      const result = await manager.fetchPhotos(mockConfig);

      expect(mockClient.authenticate).toHaveBeenCalled();
      expect(mockClient.findAlbum).not.toHaveBeenCalled();
      expect(mockClient.findTags).not.toHaveBeenCalled();
      expect(mockClient.fetchPhotos).toHaveBeenCalled();
      expect(result).toEqual(mockPhotos);
    });
  });
});
