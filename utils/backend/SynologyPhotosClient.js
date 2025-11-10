/*
 * SynologyPhotosClient.js
 *
 * MagicMirror²
 * Module: MMM-SynPhotoSlideshow
 *
 * Synology Photos API client for fetching images
 * MIT Licensed.
 */

const axios = require('axios');
const Log = require('./Logger.js');

class SynologyPhotosClient {
  constructor (config) {
    this.baseUrl = config.synologyUrl;
    this.account = config.synologyAccount;
    this.password = config.synologyPassword;
    this.albumName = config.synologyAlbumName;
    this.shareToken = config.synologyShareToken;
    this.tagNames = config.synologyTagNames || []; // Support for filtering by tags
    this.sid = null;
    this.folderIds = [];
    this.tagIds = [];
    this.useSharedAlbum = Boolean(this.shareToken);
    this.maxPhotosToFetch = config.synologyMaxPhotos || 1000;

    // API endpoints
    this.authApiPath = '/webapi/auth.cgi';
    this.photosApiPath = '/webapi/entry.cgi';
  }

  /**
   * Authenticate with Synology and get session ID
   */
  async authenticate () {
    if (this.useSharedAlbum) {
      Log.info('Using shared album token, skipping authentication');
      return true;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${this.authApiPath}`, {
        params: {
          api: 'SYNO.API.Auth',
          version: '3',
          method: 'login',
          account: this.account,
          passwd: this.password,
          session: 'FileStation',
          format: 'sid'
        },
        timeout: 10000
      });

      if (response.data.success) {
        this.sid = response.data.data.sid;
        Log.info('Successfully authenticated with Synology');
        return true;
      }
      Log.error(`Synology authentication failed: ${JSON.stringify(response.data)}`);
      return false;
    } catch (error) {
      Log.error(`Synology authentication error: ${error.message}`);
      return false;
    }
  }

  /**
   * List albums to find the target album
   */
  async findAlbum () {
    if (this.useSharedAlbum) {
      Log.info('Using shared album, skipping album search');
      return true;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Album',
          version: '1',
          method: 'list',
          offset: 0,
          limit: 100,
          _sid: this.sid
        },
        timeout: 10000
      });

      if (response.data.success) {
        const albums = response.data.data.list;

        if (!this.albumName) {
          // If no album name specified, get all albums
          Log.info(`Found ${albums.length} albums, will fetch from all`);
          this.folderIds = albums.map((album) => album.id);
          return true;
        }

        const targetAlbum = albums.find((album) => album.name.toLowerCase() === this.albumName.toLowerCase());

        if (targetAlbum) {
          Log.info(`Found album: ${targetAlbum.name}`);
          this.folderIds = [targetAlbum.id];
          return true;
        }
        Log.warn(`Album "${this.albumName}" not found. Available albums: ${albums.map((a) => a.name).join(', ')}`);
        return false;
      }
      Log.error(`Failed to list albums: ${JSON.stringify(response.data)}`);
      return false;
    } catch (error) {
      Log.error(`Error listing albums: ${error.message}`);
      return false;
    }
  }

  /**
   * Find tags by name across personal and shared spaces
   * Returns space-specific tag IDs since same tag name can have different IDs in different spaces
   */
  async findTags () {
    if (!this.tagNames || this.tagNames.length === 0) {
      return true;
    }

    try {
      this.tagIds = {};

      if (this.useSharedAlbum) {
        const params = {
          api: 'SYNO.Foto.Browse.GeneralTag',
          version: '1',
          method: 'list',
          offset: 0,
          limit: 500,
          passphrase: this.shareToken
        };

        Log.info('Fetching tags from shared album');

        const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
          params,
          timeout: 10000
        });

        if (response.data.success) {
          const allTags = response.data.data.list;
          const tagNamesLower = this.tagNames.map((t) => t.toLowerCase());
          const matchedTags = allTags.filter((tag) => tagNamesLower.includes(tag.name.toLowerCase()));

          if (matchedTags.length > 0) {
            this.tagIds.shared = matchedTags.map((tag) => tag.id);
            Log.info(`Found ${matchedTags.length} matching tags in shared album: ${matchedTags.map((t) => t.name).join(', ')}`);
            return true;
          }
          Log.warn(`No matching tags found for: ${this.tagNames.join(', ')}`);
          return false;
        }
        Log.error(`Failed to list tags: ${JSON.stringify(response.data)}`);
        return false;
      }
      const spaces = [
        {id: 0,
          name: 'personal',
          api: 'SYNO.Foto.Browse.GeneralTag'},
        {id: 1,
          name: 'shared',
          api: 'SYNO.FotoTeam.Browse.GeneralTag'}
      ];

      let foundAnyTags = false;

      for (const space of spaces) {
        try {
          const params = {
            api: space.api,
            version: '1',
            method: 'list',
            offset: 0,
            limit: 500,
            _sid: this.sid
          };

          if (space.id === 0) {
            params.space_id = 0;
          }

          const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
            params,
            timeout: 10000
          });

          if (response.data.success) {
            const allTags = response.data.data.list;
            const tagNamesLower = this.tagNames.map((t) => t.toLowerCase());
            const matchedTags = allTags.filter((tag) => tagNamesLower.includes(tag.name.toLowerCase()));

            if (matchedTags.length > 0) {
              this.tagIds[space.id] = matchedTags.map((tag) => tag.id);
              Log.info(`Found ${matchedTags.length} tag(s) in ${space.name} space: ${matchedTags.map((t) => `${t.name}(${t.id})`).join(', ')}`);
              foundAnyTags = true;
            }
          } else {
            Log.warn(`Failed to list tags in ${space.name} space`);
          }
        } catch (error) {
          Log.warn(`Error fetching tags from ${space.name} space: ${error.message}`);
        }
      }

      if (!foundAnyTags) {
        Log.warn(`No matching tags found for: ${this.tagNames.join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      Log.error(`Error listing tags: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch photos from Synology Photos (optimized with parallel requests)
   */
  async fetchPhotos () {
    try {
      let photos = [];

      if (this.tagIds && Object.keys(this.tagIds).length > 0) {
        // Fetch all tag photos in parallel for better performance
        const fetchPromises = [];

        for (const [spaceKey, tagIdArray] of Object.entries(this.tagIds)) {
          const spaceId = spaceKey === 'shared'
            ? null
            : Number.parseInt(spaceKey, 10);

          for (const tagId of tagIdArray) {
            fetchPromises.push(this.fetchPhotosByTagInSpace(tagId, spaceId));
          }
        }

        // Wait for all requests to complete
        const photoArrays = await Promise.all(fetchPromises);
        photos = photoArrays.flat();
        photos = this.removeDuplicatePhotos(photos);
      } else if (this.useSharedAlbum) {
        // Get all photos from shared album (no tag filtering)
        photos = await this.fetchSharedAlbumPhotos();
      } else {
        if (this.folderIds.length === 0) {
          // Get all photos if no specific album
          photos = await this.fetchAllPhotos();
        } else {
          // Get photos from all albums in parallel
          const albumPromises = this.folderIds.map((folderId) => this.fetchAlbumPhotos(folderId));
          const photoArrays = await Promise.all(albumPromises);
          photos = photoArrays.flat();
        }
      }

      Log.info(`Fetched ${photos.length} photos from Synology Photos`);
      return photos;
    } catch (error) {
      Log.error(`Error fetching photos: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch photos from a shared album using token
   */
  async fetchSharedAlbumPhotos () {
    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Item',
          version: '1',
          method: 'list',
          offset: 0,
          limit: this.maxPhotosToFetch,
          passphrase: this.shareToken,
          additional: '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(`Failed to fetch shared album photos: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      Log.error(`Error fetching shared album photos: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch all photos from Synology Photos
   */
  async fetchAllPhotos () {
    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Item',
          version: '1',
          method: 'list',
          offset: 0,
          limit: this.maxPhotosToFetch,
          _sid: this.sid,
          additional: '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(`Failed to fetch all photos: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      Log.error(`Error fetching all photos: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch photos from a specific album
   */
  async fetchAlbumPhotos (albumId) {
    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Item',
          version: '1',
          method: 'list',
          offset: 0,
          limit: this.maxPhotosToFetch,
          album_id: albumId,
          _sid: this.sid,
          additional: '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(`Failed to fetch album photos: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      Log.error(`Error fetching album photos: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch photos by tag from a specific space
   */
  async fetchPhotosByTagInSpace (tagId, spaceId) {
    try {
      // Use different API for shared space (space_id 1)
      const params = {
        api: spaceId === 1
          ? 'SYNO.FotoTeam.Browse.Item'
          : 'SYNO.Foto.Browse.Item',
        version: '1',
        method: 'list',
        offset: 0,
        limit: this.maxPhotosToFetch,
        general_tag_id: tagId,
        additional: '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
      };

      // Add authentication and space parameters
      if (this.useSharedAlbum) {
        params.passphrase = this.shareToken;
      } else {
        params._sid = this.sid;
        // Only add space_id for personal space (0)
        if (spaceId === 0) {
          params.space_id = spaceId;
        }
      }

      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params,
        timeout: 30000
      });

      if (response.data.success) {
        const rawPhotos = response.data.data.list;
        return this.processPhotoList(rawPhotos, spaceId);
      }
      return [];
    } catch (error) {
      Log.error(`Error fetching photos by tag from space ${spaceId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove duplicate photos from array using synologyId
   */
  removeDuplicatePhotos (photos) {
    const seen = new Set();
    return photos.filter((photo) => {
      const dedupeKey = photo.synologyId || photo.id;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    });
  }

  /**
   * Process photo list and extract relevant information
   */
  processPhotoList (photos, spaceId = null) {
    const imageList = [];

    for (const photo of photos) {
      // Only include photos, not videos
      if (photo.type === 'photo' || photo.type === 'live_photo') {
        const imageUrl = this.getPhotoUrl(photo.id, photo.additional?.thumbnail?.cache_key, spaceId);

        // Create unique ID that includes space information if provided
        const uniqueId = spaceId !== null
          ? `${spaceId}_${photo.id}`
          : photo.id;

        imageList.push({
          path: photo.filename || `photo_${photo.id}`,
          url: imageUrl,
          id: uniqueId,
          synologyId: photo.id, // Keep original ID for API calls
          spaceId,
          created: photo.time
            ? photo.time * 1000
            : Date.now(),
          modified: photo.indexed_time
            ? photo.indexed_time * 1000
            : Date.now(),
          isSynology: true
        });
      }
    }

    return imageList;
  }

  /**
   * Generate photo URL for downloading
   */
  getPhotoUrl (photoId, cacheKey, spaceId = null) {
    let url;

    if (this.useSharedAlbum) {
      url = `${this.baseUrl}${this.photosApiPath}?api=SYNO.Foto.Thumbnail&version=2&method=get&id=${photoId}&cache_key="${cacheKey}"&type="unit"&size="xl"&passphrase=${this.shareToken}`;
    } else {
      // Use FotoTeam API for shared space photos (space_id 1)
      const api = spaceId === 1
        ? 'SYNO.FotoTeam.Thumbnail'
        : 'SYNO.Foto.Thumbnail';
      url = `${this.baseUrl}${this.photosApiPath}?api=${api}&version=2&method=get&id=${photoId}&cache_key="${cacheKey}"&type="unit"&size="xl"&_sid=${this.sid}`;

      // Only add space_id for personal space (0)
      if (spaceId === 0) {
        url += `&space_id=${spaceId}`;
      }
    }

    return url;
  }

  /**
   * Download photo from Synology
   */
  async downloadPhoto (photoUrl) {
    try {
      const response = await axios.get(photoUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data, 'binary');
    } catch (error) {
      Log.error(`Error downloading photo: ${error.message}`);
      return null;
    }
  }

  /**
   * Logout and end session
   */
  async logout () {
    if (this.useSharedAlbum || !this.sid) {
      return;
    }

    try {
      await axios.get(`${this.baseUrl}${this.authApiPath}`, {
        params: {
          api: 'SYNO.API.Auth',
          version: '3',
          method: 'logout',
          session: 'FileStation',
          _sid: this.sid
        },
        timeout: 5000
      });
      Log.info('Logged out from Synology');
    } catch (error) {
      Log.error(`Error logging out: ${error.message}`);
    }
  }
}

module.exports = SynologyPhotosClient;
