/**
 * SynologyPhotosClient.ts
 *
 * MagicMirror²
 * Module: MMM-SynPhotoSlideshow
 *
 * Synology Photos API client for fetching images
 * By Spydersoft Consulting
 * MIT Licensed.
 */

import axios from 'axios';
import Log from './Logger';
import type { ModuleConfig, PhotoItem } from '../types';

interface SynologyPhoto {
  id: number;
  type: string;
  filename?: string;
  time?: number;
  indexed_time?: number;
  additional?: {
    thumbnail?: {
      cache_key?: string;
    };
  };
}

interface SynologyAlbum {
  id: number;
  name: string;
}

interface SynologyTag {
  id: number;
  name: string;
}

interface TagIds {
  [key: string]: number[];
}

class SynologyPhotosClient {
  private readonly baseUrl: string;

  private readonly account: string;

  private readonly password: string;

  private readonly albumName: string;

  private readonly shareToken: string;

  private readonly tagNames: string[];

  private sid: string | null = null;

  private folderIds: number[] = [];

  private tagIds: TagIds = {};

  private useSharedAlbum: boolean;

  private maxPhotosToFetch: number;

  private authApiPath = '/webapi/auth.cgi';

  private photosApiPath = '/webapi/entry.cgi';

  constructor(config: ModuleConfig) {
    this.baseUrl = config.synologyUrl;
    this.account = config.synologyAccount;
    this.password = config.synologyPassword;
    this.albumName = config.synologyAlbumName;
    this.shareToken = config.synologyShareToken;
    this.tagNames = config.synologyTagNames || [];
    this.useSharedAlbum = Boolean(this.shareToken);
    this.maxPhotosToFetch = config.synologyMaxPhotos || 1000;
  }

  /**
   * Authenticate with Synology and get session ID
   */
  async authenticate(): Promise<boolean> {
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
      Log.error(
        `Synology authentication failed: ${JSON.stringify(response.data)}`
      );
      return false;
    } catch (error) {
      Log.error(`Synology authentication error: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * List albums to find the target album
   */
  async findAlbum(): Promise<boolean> {
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
        const albums: SynologyAlbum[] = response.data.data.list;

        if (!this.albumName) {
          Log.info(`Found ${albums.length} albums, will fetch from all`);
          this.folderIds = albums.map((album) => album.id);
          return true;
        }

        const targetAlbum = albums.find(
          (album) => album.name.toLowerCase() === this.albumName.toLowerCase()
        );

        if (targetAlbum) {
          Log.info(`Found album: ${targetAlbum.name}`);
          this.folderIds = [targetAlbum.id];
          return true;
        }
        Log.warn(
          `Album "${this.albumName}" not found. Available albums: ${albums.map((a) => a.name).join(', ')}`
        );
        return false;
      }
      Log.error(`Failed to list albums: ${JSON.stringify(response.data)}`);
      return false;
    } catch (error) {
      Log.error(`Error listing albums: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Filter tags by name
   */
  private filterMatchingTags(allTags: SynologyTag[]): SynologyTag[] {
    const tagNamesLower = new Set(this.tagNames.map((t) => t.toLowerCase()));
    return allTags.filter((tag) => tagNamesLower.has(tag.name.toLowerCase()));
  }

  /**
   * Find tags in shared album
   */
  private async findTagsInSharedAlbum(): Promise<boolean> {
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

    if (!response.data.success) {
      Log.error(`Failed to list tags: ${JSON.stringify(response.data)}`);
      return false;
    }

    const matchedTags = this.filterMatchingTags(response.data.data.list);

    if (matchedTags.length === 0) {
      Log.warn(`No matching tags found for: ${this.tagNames.join(', ')}`);
      return false;
    }

    this.tagIds.shared = matchedTags.map((tag) => tag.id);
    Log.info(
      `Found ${matchedTags.length} matching tags in shared album: ${matchedTags.map((t) => t.name).join(', ')}`
    );
    return true;
  }

  /**
   * Find tags in a specific space
   */
  private async findTagsInSpace(space: {
    id: number;
    name: string;
    api: string;
  }): Promise<boolean> {
    const params: Record<string, unknown> = {
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

    if (!response.data.success) {
      Log.warn(`Failed to list tags in ${space.name} space`);
      return false;
    }

    const matchedTags = this.filterMatchingTags(response.data.data.list);

    if (matchedTags.length === 0) {
      return false;
    }

    this.tagIds[space.id] = matchedTags.map((tag) => tag.id);
    const tagDescriptions = matchedTags
      .map((t) => `${t.name}(${t.id})`)
      .join(', ');
    Log.info(
      `Found ${matchedTags.length} tag(s) in ${space.name} space: ${tagDescriptions}`
    );
    return true;
  }

  /**
   * Find tags across personal and shared spaces
   */
  private async findTagsInMultipleSpaces(): Promise<boolean> {
    const spaces = [
      { id: 0, name: 'personal', api: 'SYNO.Foto.Browse.GeneralTag' },
      { id: 1, name: 'shared', api: 'SYNO.FotoTeam.Browse.GeneralTag' }
    ];

    let foundAnyTags = false;

    for (const space of spaces) {
      try {
        const found = await this.findTagsInSpace(space);
        if (found) {
          foundAnyTags = true;
        }
      } catch (error) {
        Log.warn(
          `Error fetching tags from ${space.name} space: ${(error as Error).message}`
        );
      }
    }

    if (!foundAnyTags) {
      Log.warn(`No matching tags found for: ${this.tagNames.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Find tags by name across personal and shared spaces
   */
  async findTags(): Promise<boolean> {
    if (!this.tagNames || this.tagNames.length === 0) {
      return true;
    }

    try {
      this.tagIds = {};

      if (this.useSharedAlbum) {
        return await this.findTagsInSharedAlbum();
      }

      return await this.findTagsInMultipleSpaces();
    } catch (error) {
      Log.error(`Error listing tags: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Fetch photos by tags across spaces
   */
  private async fetchPhotosByTags(): Promise<PhotoItem[]> {
    const fetchPromises: Promise<PhotoItem[]>[] = [];

    Log.info(
      `Fetching photos for tags across spaces: ${JSON.stringify(this.tagIds)}`
    );

    for (const [spaceKey, tagIdArray] of Object.entries(this.tagIds)) {
      const spaceId = spaceKey === 'shared' ? 1 : Number.parseInt(spaceKey, 10);
      Log.info(
        `Processing space ${spaceKey} (ID: ${spaceId}) with ${tagIdArray.length} tag(s)`
      );

      for (const tagId of tagIdArray) {
        fetchPromises.push(this.fetchPhotosByTagInSpace(tagId, spaceId));
      }
    }

    Log.info(`Created ${fetchPromises.length} fetch promises`);
    const photoArrays = await Promise.all(fetchPromises);
    Log.info(
      `Received ${photoArrays.length} photo arrays: ${photoArrays.map((arr) => arr.length).join(', ')} photos each`
    );

    const photos = photoArrays.flat();
    Log.info(`Total photos before deduplication: ${photos.length}`);

    const deduplicated = this.removeDuplicatePhotos(photos);
    Log.info(`Total photos after deduplication: ${deduplicated.length}`);

    return deduplicated;
  }

  /**
   * Fetch photos from albums
   */
  private async fetchPhotosFromAlbums(): Promise<PhotoItem[]> {
    if (this.folderIds.length === 0) {
      return await this.fetchAllPhotos();
    }

    const albumPromises = this.folderIds.map((folderId) =>
      this.fetchAlbumPhotos(folderId)
    );
    const photoArrays = await Promise.all(albumPromises);
    return photoArrays.flat();
  }

  /**
   * Fetch photos from Synology Photos
   */
  async fetchPhotos(): Promise<PhotoItem[]> {
    try {
      let photos: PhotoItem[] = [];

      if (this.tagIds && Object.keys(this.tagIds).length > 0) {
        photos = await this.fetchPhotosByTags();
      } else if (this.useSharedAlbum) {
        photos = await this.fetchSharedAlbumPhotos();
      } else {
        photos = await this.fetchPhotosFromAlbums();
      }

      Log.info(`Fetched ${photos.length} photos from Synology Photos`);
      return photos;
    } catch (error) {
      Log.error(`Error fetching photos: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Fetch photos from a shared album using token
   */
  private async fetchSharedAlbumPhotos(): Promise<PhotoItem[]> {
    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Item',
          version: '1',
          method: 'list',
          offset: 0,
          limit: this.maxPhotosToFetch,
          passphrase: this.shareToken,
          additional:
            '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(
        `Failed to fetch shared album photos: ${JSON.stringify(response.data)}`
      );
      return [];
    } catch (error) {
      Log.error(
        `Error fetching shared album photos: ${(error as Error).message}`
      );
      return [];
    }
  }

  /**
   * Fetch all photos from Synology Photos
   */
  private async fetchAllPhotos(): Promise<PhotoItem[]> {
    try {
      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params: {
          api: 'SYNO.Foto.Browse.Item',
          version: '1',
          method: 'list',
          offset: 0,
          limit: this.maxPhotosToFetch,
          _sid: this.sid,
          additional:
            '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(`Failed to fetch all photos: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      Log.error(`Error fetching all photos: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Fetch photos from a specific album
   */
  private async fetchAlbumPhotos(albumId: number): Promise<PhotoItem[]> {
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
          additional:
            '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
        },
        timeout: 30000
      });

      if (response.data.success) {
        return this.processPhotoList(response.data.data.list);
      }
      Log.error(
        `Failed to fetch album photos: ${JSON.stringify(response.data)}`
      );
      return [];
    } catch (error) {
      Log.error(`Error fetching album photos: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Fetch photos by tag from a specific space
   */
  private async fetchPhotosByTagInSpace(
    tagId: number,
    spaceId: number | null
  ): Promise<PhotoItem[]> {
    try {
      const params: Record<string, unknown> = {
        api:
          spaceId === 1 ? 'SYNO.FotoTeam.Browse.Item' : 'SYNO.Foto.Browse.Item',
        version: '1',
        method: 'list',
        offset: 0,
        limit: this.maxPhotosToFetch,
        general_tag_id: tagId,
        additional:
          '["thumbnail","resolution","orientation","video_convert","video_meta","provider_user_id"]'
      };

      if (this.useSharedAlbum) {
        params.passphrase = this.shareToken;
      } else {
        params._sid = this.sid;
        if (spaceId === 0) {
          params.space_id = spaceId;
        }
      }

      Log.info(
        `Fetching photos for tag ${tagId} in space ${spaceId} with API: ${params.api}`
      );

      const response = await axios.get(`${this.baseUrl}${this.photosApiPath}`, {
        params,
        timeout: 30000
      });

      if (response.data.success) {
        const rawPhotos: SynologyPhoto[] = response.data.data.list;
        Log.info(
          `API returned ${rawPhotos.length} photos for tag ${tagId} in space ${spaceId}`
        );
        return this.processPhotoList(rawPhotos, spaceId);
      }
      Log.warn(
        `API call failed for tag ${tagId} in space ${spaceId}: ${JSON.stringify(response.data)}`
      );
      return [];
    } catch (error) {
      Log.error(
        `Error fetching photos by tag ${tagId} from space ${spaceId}: ${(error as Error).message}`
      );
      return [];
    }
  }

  /**
   * Remove duplicate photos from array using synologyId
   */
  private removeDuplicatePhotos(photos: PhotoItem[]): PhotoItem[] {
    const seen = new Set<string | number>();
    return photos.filter((photo) => {
      const dedupeKey =
        (photo as PhotoItem & { synologyId?: number; id?: number })
          .synologyId || (photo as PhotoItem & { id?: number }).id;
      if (seen.has(dedupeKey!)) {
        return false;
      }
      seen.add(dedupeKey!);
      return true;
    });
  }

  /**
   * Process photo list and extract relevant information
   */
  private processPhotoList(
    photos: SynologyPhoto[],
    spaceId: number | null = null
  ): PhotoItem[] {
    const imageList: PhotoItem[] = [];

    for (const photo of photos) {
      if (photo.type !== 'photo' && photo.type !== 'live_photo') {
        continue;
      }

      const imageUrl = this.getPhotoUrl(
        photo.id,
        photo.additional?.thumbnail?.cache_key,
        spaceId
      );
      const uniqueId = spaceId === null ? photo.id : `${spaceId}_${photo.id}`;

      imageList.push({
        path: photo.filename || `photo_${photo.id}`,
        url: imageUrl,
        created: photo.time ? photo.time * 1000 : Date.now(),
        modified: photo.indexed_time ? photo.indexed_time * 1000 : Date.now(),
        id: uniqueId,
        synologyId: photo.id,
        spaceId,
        isSynology: true
      } as PhotoItem & {
        id: number | string;
        synologyId: number;
        spaceId: number | null;
        isSynology: boolean;
      });
    }

    return imageList;
  }

  /**
   * Generate photo URL for downloading
   */
  private getPhotoUrl(
    photoId: number,
    cacheKey: string | undefined,
    spaceId: number | null = null
  ): string {
    let url: string;
    const quotedCacheKey = `"${cacheKey}"`;

    if (this.useSharedAlbum) {
      url = `${this.baseUrl}${this.photosApiPath}?api=SYNO.Foto.Thumbnail&version=2&method=get&id=${photoId}&cache_key=${quotedCacheKey}&type="unit"&size="xl"&passphrase=${this.shareToken}`;
    } else {
      const api =
        spaceId === 1 ? 'SYNO.FotoTeam.Thumbnail' : 'SYNO.Foto.Thumbnail';
      url = `${this.baseUrl}${this.photosApiPath}?api=${api}&version=2&method=get&id=${photoId}&cache_key=${quotedCacheKey}&type="unit"&size="xl"&_sid=${this.sid}`;

      if (spaceId === 0) {
        url += `&space_id=${spaceId}`;
      }
    }

    return url;
  }

  /**
   * Download photo from Synology
   */
  async downloadPhoto(photoUrl: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(photoUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data, 'binary');
    } catch (error) {
      Log.error(`Error downloading photo: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Logout and end session
   */
  async logout(): Promise<void> {
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
      Log.error(`Error logging out: ${(error as Error).message}`);
    }
  }
}

export default SynologyPhotosClient;
