# MMM-SynPhotoSlideshow

[![PR Checks](https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/actions/workflows/pr-checks.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=spydersoft-consulting_MMM-SynPhotoSlideshow&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=spydersoft-consulting_MMM-SynPhotoSlideshow)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=spydersoft-consulting_MMM-SynPhotoSlideshow&metric=coverage)](https://sonarcloud.io/summary/new_code?id=spydersoft-consulting_MMM-SynPhotoSlideshow)

Display a full-screen slideshow of photos from your Synology Photos library on [MagicMirror²](https://magicmirror.builders/). Perfect for creating a dynamic photo frame!

The `MMM-SynPhotoSlideshow` module connects directly to your Synology DiskStation's Photos app to display images fullscreen, one at a time on a fixed interval. Images can be shown in order or at random, with smooth transitions and various display options.

**This module is specifically designed for Synology Photos and requires a Synology NAS with the Photos app installed.**

Based on [MMM-ImageSlideshow](https://github.com/AdamMoses-GitHub/MMM-ImageSlideshow/) and [MMM-BackgroundSlideshow](https://github.com/darickc/MMM-BackgroundSlideshow/).

<img src="https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/blob/master/screenshots/landscape.jpg" style="width: 300px;" alt="landscape screenshot" />
<img src="https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/blob/master/screenshots/portait.jpg" style="width: 300px;" alt="portrait screenshot" />

## Dependencies / Requirements

- A Synology DiskStation with Synology Photos installed
- Network access to your Synology NAS from your MagicMirror device
- Either:
  - Synology account credentials with access to Photos, OR
  - A shared album link (public share token)

## Operation

This module connects to your Synology Photos library and fetches your photo collection. You can display:

- All photos from your entire library
- Photos from a specific album
- Photos from a publicly shared album (no login required)

Photos are displayed one at a time with configurable timing, transitions, and display options. Once all images have been shown, the module loops back to the beginning.

## Using the module

### Installation

To install the module, clone the repository into the `~/MagicMirror/modules/` directory and install the dependencies:

```sh
cd ~/MagicMirror/modules/
git clone https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow
cd MMM-SynPhotoSlideshow
npm install
```

**For production use** (to save disk space and exclude development tools):

```sh
npm run install:prod
```

This installs only the runtime dependencies (axios, dotenv, exif-js, node-cache, sharp) and excludes development dependencies like linters and test frameworks.

### Basic Configuration

Add the module to the modules array in the `config/config.js` file. You must provide your Synology URL and either account credentials or a share token:

```javascript
  {
    module: 'MMM-SynPhotoSlideshow',
    position: 'fullscreen_below',
    config: {
      synologyUrl: 'http://192.168.1.100:5000',  // Your Synology URL
      synologyAccount: 'your-username',           // Your Synology username
      synologyPassword: 'your-password',          // Your Synology password
      slideshowSpeed: 60000,                      // 60 seconds per image
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

### Configuration Options

This module supports two configuration methods:

1. **config.js** - Traditional MagicMirror configuration
2. **Environment Variables** - Recommended for keeping credentials secure

📖 **[Complete Synology Setup Guide](docs/SYNOLOGY_SETUP.md)** - For detailed setup instructions, troubleshooting, and examples.

#### Using Environment Variables (Recommended)

Keep your credentials secure by using environment variables:

1. Copy `.env.example` to `.env`:

   ```bash
   cd ~/MagicMirror/modules/MMM-SynPhotoSlideshow
   cp .env.example .env
   ```

2. Edit `.env` with your settings:

   ```bash
   nano .env
   ```

3. Configure the module in `config.js`:

   **Option A: Minimal config (all settings from .env):**

   ```javascript
   {
     module: 'MMM-SynPhotoSlideshow',
     position: 'fullscreen_below',
     config: {
       // All settings loaded from .env
     }
   }
   ```

   **Option B: Mix .env and config.js (display settings in config):**

   ```javascript
   {
     module: 'MMM-SynPhotoSlideshow',
     position: 'fullscreen_below',
     config: {
       // Credentials loaded from .env
       // Display settings here
       slideshowSpeed: 60000,
       transitionImages: true,
       randomizeImageOrder: true
     }
   }
   ```

4. Start MagicMirror normally:

   ```bash
   cd ~/MagicMirror
   npm start
   ```

   Check the logs to verify the .env file was loaded:

   ```
   [MMM-SynPhotoSlideshow] Looking for .env file at: /path/to/.env
   [MMM-SynPhotoSlideshow] Successfully loaded configuration from .env file
   [MMM-SynPhotoSlideshow] Using environment variables: SYNOLOGY_URL, SYNOLOGY_ACCOUNT, SYNOLOGY_PASSWORD
   ```

**Note:** Environment variables override values in `config.js`, so you can mix both methods. See `.env.example` for all 20+ available variables.

#### Troubleshooting .env Loading

If your .env file isn't being loaded, check the logs for:

```bash
# Look for these messages in MagicMirror logs:
[MMM-SynPhotoSlideshow] Looking for .env file at: /home/user/MagicMirror/modules/MMM-SynPhotoSlideshow/.env
[MMM-SynPhotoSlideshow] .env file not found, using config.js values only
```

Common issues:

- **Wrong location:** .env must be in the module directory (`MMM-SynPhotoSlideshow/.env`)
- **Typo in filename:** Must be exactly `.env` (starts with a dot)
- **Missing values:** Check logs for warnings about missing `synologyUrl` or authentication
- **Syntax errors:** No spaces around `=`, no quotes needed for values

**Working with an empty config.js:**

You can use a completely empty config if all settings are in .env:

```javascript
{
  module: 'MMM-SynPhotoSlideshow',
  position: 'fullscreen_below',
  config: {} // Empty - everything from .env
}
```

The module will automatically:

1. Load settings from `.env` file in the backend
2. Log the path where it's looking for `.env`
3. Show warnings if required values (URL, credentials) are missing from both sources

Check MagicMirror logs after starting to see:

```
[MMM-SynPhotoSlideshow] Looking for .env file at: /home/user/MagicMirror/modules/MMM-SynPhotoSlideshow/.env
[MMM-SynPhotoSlideshow] Successfully loaded configuration from .env file
```

### Authentication Methods

This module supports two ways to authenticate with Synology Photos:

#### Method 1: Using Account Credentials (Private Albums)

Access your private photo library with your Synology account:

```javascript
  {
    module: 'MMM-SynPhotoSlideshow',
    position: 'fullscreen_below',
    config: {
      synologyUrl: 'https://your-synology-url.com:5001', // or http://192.168.1.100:5000
      synologyAccount: 'your-username',
      synologyPassword: 'your-password',
      synologyAlbumName: 'Family Photos', // Optional: specific album, leave empty for all photos
      synologyMaxPhotos: 1000,
      slideshowSpeed: 60000,
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

#### Method 2: Using Shared Album Link (No Login Required)

Perfect for publicly shared albums - no credentials needed:

1. In Synology Photos, open an album and click "Share"
2. Enable "Share via link" and copy the link
3. Extract the passphrase/token from the URL (the part after `passphrase=`)

```javascript
  {
    module: 'MMM-SynPhotoSlideshow',
    position: 'fullscreen_below',
    config: {
      synologyUrl: 'https://your-synology-url.com:5001',
      synologyShareToken: 'your-share-token-from-link',
      synologyMaxPhotos: 1000,
      slideshowSpeed: 60000,
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

You can also filter by tags in shared albums:

```javascript
  {
    module: 'MMM-SynPhotoSlideshow',
    position: 'fullscreen_below',
    config: {
      synologyUrl: 'https://your-synology-url.com:5001',
      synologyShareToken: 'your-share-token-from-link',
      synologyTagNames: ['Favorites', 'Best'], // Filter shared album by tags
      synologyMaxPhotos: 1000,
      slideshowSpeed: 60000,
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

#### Filtering by Tags

You can filter photos by tags assigned in Synology Photos. This is useful for displaying specific categories of photos (e.g., 'Vacation', 'Family', 'Favorites'):

```javascript
  {
    module: 'MMM-SynPhotoSlideshow',
    position: 'fullscreen_below',
    config: {
      synologyUrl: 'http://192.168.1.100:5000',
      synologyAccount: 'your-username',
      synologyPassword: 'your-password',
      synologyTagNames: ['Vacation', 'Travel'], // Only show photos with these tags
      synologyMaxPhotos: 1000,
      slideshowSpeed: 60000,
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

**Note:** Tag filtering works with both personal accounts (using credentials) and shared albums (using share tokens). When using personal account credentials, photos are fetched from both your personal space and any shared spaces you have access to. If a photo has multiple matching tags, it will only appear once in the slideshow.

I also recommend adding the following to the `custom.css` to make the text a little brighter:

```css
.normal,
.dimmed,
header,
body {
  color: #fff;
}
```

## Update

To update the module, go to the module directory, pull the latest changes, and install any new dependencies:

```sh
cd ~/MagicMirror/modules/MMM-SynPhotoSlideshow
git pull
npm install
```

## Notification options

The following notifications can be used:

<table width="100%">
  <!-- why, markdown... -->
  <thead>
    <tr>
      <th>Notification</th>
      <th width="100%">Description</th>
    </tr>
  <thead>
  <tbody>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_UPDATE_IMAGE_LIST</code></td>
      <td>Reload images list and start slideshow from first image. Works best when sorted by modified date descending.<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_NEXT</code></td>
      <td>Change to the next image, restart the timer for image changes only if already running<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PREVIOUS</code></td>
      <td>Change to the previous image, restart the timer for image changes only if already running<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PAUSE</code></td>
      <td>Pause the timer for image changes<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PLAY</code></td>
      <td>Change to the next image and start the timer for image changes<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_URL</code></td>
      <td>Show an image by passing an object with a URL. Include resume=true to continue slideshow after displaying image, otherwise the image will display until another notification such as BACKGROUNDSLIDESHOW_PLAY.
       <br>Example payload: {url:'url_to_image', resume: true}
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_URLS</code></td>
      <td>Pass in a list of URLs to display in the background.  To continue showing photos, pass in an empty array or no payload.
       <br>Example payload: {urls:['url_to_image', 'url_to_image']}
      </td>
    </tr>
</table>

## Configuration options

The following properties can be configured:

<table width="100%">
  <!-- why, markdown... -->
  <thead>
    <tr>
      <th>Option</th>
      <th width="100%">Description</th>
    </tr>
  <thead>
  <tbody>
    <tr>
    <tr>
    <tr>
      <td><code>synologyUrl</code></td>
      <td>String value, the URL to your Synology DiskStation. Include protocol (http/https) and port if needed.<br>
        <br><b>Example:</b> <code>'https://your-nas.synology.me:5001'</code>
        <br><b>Example:</b> <code>'http://192.168.1.100:5000'</code>
        <br><b>Default value:</b> <code>''</code>
        <br>This value is <b>REQUIRED</b> if useSynologyPhotos is true
      </td>
    </tr>
    <tr>
      <td><code>synologyAccount</code></td>
      <td>String value, your Synology account username. Not needed if using synologyShareToken.<br>
        <br><b>Example:</b> <code>'admin'</code>
        <br><b>Default value:</b> <code>''</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>synologyPassword</code></td>
      <td>String value, your Synology account password. Not needed if using synologyShareToken.<br>
        <br><b>Example:</b> <code>'your-password'</code>
        <br><b>Default value:</b> <code>''</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>synologyAlbumName</code></td>
      <td>String value, name of a specific album to fetch photos from. Leave empty to fetch from all albums. Not used with shared album tokens or when synologyTagNames is specified.<br>
        <br><b>Example:</b> <code>'Vacation 2024'</code>
        <br><b>Default value:</b> <code>''</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>synologyTagNames</code></td>
      <td>Array of strings, tag names to filter photos by. Photos must have at least one of these tags to be included. Works with both personal accounts (credentials) and shared albums (share tokens). Takes priority over synologyAlbumName.<br>
        <br><b>Example:</b> <code>['Vacation', 'Family', 'Favorites']</code>
        <br><b>Default value:</b> <code>[]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>synologyShareToken</code></td>
      <td>String value, the passphrase/token from a Synology Photos shared album link. Use this instead of account credentials for public shared albums.<br>
        <br><b>Example:</b> <code>'AbCdEfGh123456'</code>
        <br><b>Default value:</b> <code>''</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>synologyMaxPhotos</code></td>
      <td>Integer value, maximum number of photos to fetch from Synology Photos in a single request.<br>
        <br><b>Example:</b> <code>500</code>
        <br><b>Default value:</b> <code>1000</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>refreshImageListInterval</code></td>
      <td>Integer value, how often to refresh the image list from Synology Photos, in milliseconds. This allows the slideshow to automatically pick up new photos or changes without restarting MagicMirror. Set to 0 to disable automatic refreshing.<br>
        <br><b>Example:</b> <code>1800000</code> for 30 minutes
        <br><b>Default value:</b> <code>3600000</code> or 1 hour
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>enableImageCache</code></td>
      <td>Boolean value, enables local disk caching of downloaded images for improved performance. When enabled, images are cached locally and preloaded in the background, significantly reducing load times on low-CPU devices.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageCacheMaxSize</code></td>
      <td>Integer value, maximum size of the image cache in megabytes. The cache will automatically manage disk space and evict old images when this limit is reached.<br>
        <br><b>Example:</b> <code>1000</code> for 1GB
        <br><b>Default value:</b> <code>500</code> (500MB)
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageCachePreloadCount</code></td>
      <td>Integer value, number of upcoming images to preload in the background. Higher values improve responsiveness but use more network bandwidth initially.<br>
        <br><b>Example:</b> <code>20</code>
        <br><b>Default value:</b> <code>10</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
    <tr>
      <td><code>slideshowSpeed</code></td>
      <td>Integer value, the length of time to show one image before switching to the next, in milliseconds.<br>
        <br><b>Example:</b> <code>6000</code> for 6 seconds
        <br><b>Default value:</b> <code>10000</code> or 10 seconds
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>resizeImages</code></td>
      <td>Boolean value, if images should be resized or not.  For better performance, this should be true and the height and width set to the resolution of the monitor being used<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>maxWidth</code></td>
      <td>Integer value, the width the image should be resized to.<br>
        <br><b>Example:</b> <code>3840</code>
        <br><b>Default value:</b> <code>1920</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>maxHeight</code></td>
      <td>Integer value, the height the image should be resized to.<br>
        <br><b>Example:</b> <code>2160</code>
        <br><b>Default value:</b> <code>1080</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>randomizeImageOrder</code></td>
      <td>Boolean value, if true will randomize the order of the images, otherwise use sortImagesBy and sortImagesDescending sorting by filename.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>fitPortraitImages</code></td>
      <td>Boolean value, if true portrait images will be automatically resized to fit on landscape screens using 'contain' mode with black bars on the sides to prevent distortion. This ensures portrait photos display completely without being cropped.<br>
        <br><b>Example:</b> <code>false</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
    <tr>
      <td><code>showAllImagesBeforeRestart</code></td>
      <td>Boolean value, if true will keep track of all the allready shown files and not show them untill all images has been shown<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>sortImagesBy</code></td>
      <td>String value, determines how images are sorted.  Possible values are: name (by file name), created (by file created date), modified (by file
      modified date). Only used if randomizeImageOrder is set to false.<br>
        <br><b>Example:</b> <code>created</code>
        <br><b>Default value:</b> <code>name</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>sortImagesDescending</code></td>
      <td>Boolean value, if true will sort images in descending order, otherwise in ascending order. Only used if randomizeImageOrder is set to false.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
        <tr>
        <tr>
    <tr>
      <td><code>showImageInfo</code></td>
      <td>Boolean value, if true a div containing the currently displayed image information will be shown.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfoLocation</code></td>
      <td>String value, determines which corner of the screen the image info div should be displayed in.  Possible values are: bottomRight, bottomLeft, topLeft, topRight<br>
        <br><b>Example:</b> <code>topLeft</code>
        <br><b>Default value:</b> <code>bottomRight</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfo</code></td>
      <td>String value, a list of image properties to display in the image info div, separated by commas.  Possible values are : date (EXIF date from image), name (image name).
      For the iamge name, the relative path from that defined in imagePaths is displayed if the recursiveSubDirectories option is set to true.<br>
        <br><b>Example:</b> <code>date,name</code>
        <br><b>Default value:</b> <code>name</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfoNoFileExt</code></td>
      <td>Boolean value, if true the file extension will be removed before the image name is displayed.
      <br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>      <tr>
      <td><code>transitionSpeed</code></td>
      <td>Transition speed from one image to the other, transitionImages must be true. Must be a valid css transition duration.<br>
        <br><b>Example:</b> <code>'2s'</code>
        <br><b>Default value:</b> <code>'1s'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showProgressBar</code></td>
      <td>Boolean value, if true a progress bar indicating how long till the next image is
      displayed is shown.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>backgroundSize</code></td>
      <td>The sizing of the background image. Values can be:<br>
        cover: Resize the background image to cover the entire container, even if it has to stretch the image or cut a little bit off one of the edges.<br>
        contain: Resize the background image to make sure the image is fully visible<br>
        <br><b>Example:</b> <code>'contain'</code>
        <br><b>Default value:</b> <code>'cover'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>backgroundPosition</code></td>
      <td>Determines where the background image is placed if it doesn't fill the whole screen (i.e. backgroundSize is 'contain'). Module already defaults to 'center', so the most useful options would be: 'top' 'bottom' 'left' or 'right'. However, any valid value for CSS background-position could be used.<br>
        <br><b>Example:</b> <code>'top'</code>
        <br><b>Default value:</b> <code>'center'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>transitionImages</code></td>
      <td>Transition from one image to the other (may be a bit choppy on slower devices, or if the images are too big).<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>gradient</code></td>
      <td>The vertical gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
              <br><b>Default value:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%",
        "rgba(0, 0, 0, 0) 80%",
        "rgba(0, 0, 0, 0.75) 100%"
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>horizontalGradient</code></td>
      <td>The horizontal gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
              <br><b>Default value:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%",
        "rgba(0, 0, 0, 0) 80%",
        "rgba(0, 0, 0, 0.75) 100%"
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
        <tr>
      <td><code>radialGradient</code></td>
      <td>A radial gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
          <br><b>Default value:</b> <code>[
                    "rgba(0,0,0,0) 0%",
                    "rgba(0,0,0,0) 75%",
                    "rgba(0,0,0,0.25) 100%""
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>gradientDirection</code></td>
      <td>The direction of the gradient<br>
        <br><b>Example:</b> <code>'horizontal'</code>
        <br><b>Default value:</b> <code>'vertical'</code>
        <br><b>Possible values:</b> <code>'vertical', 'horizontal', 'both', 'radial'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>backgroundAnimationEnabled</code></td>
      <td>Boolean value, if set to true the background will scroll if the picture is larger than the screen size (e.g. for panaramic pictures).  The picture will either scroll vertically or horizontally depending on which dimension extends beyond the screen size.
      <b>Note:</b> For this to work, backgroundSize must be set to cover.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>transitions</code></td>
      <td>Array value containing strings defining what transitions to perform.
      <b>Note:</b> transitionImages must be set to true.<br>
        <br><b>Example:</b> <code>['opacity', 'slideFromLeft']</code>
        <br><b>Default value:</b> <code>['opacity', 'slideFromRight', 'slideFromLeft', 'slideFromTop', 'slideFromBottom', 'slideFromTopLeft', 'slideFromTopRight', 'slideFromBottomLeft', 'slideFromBottomRight', 'flipX', 'flipY']</code>
        <br><b>Possible values:</b> <code>'opacity', 'slideFromRight', 'slideFromLeft', 'slideFromTop', 'slideFromBottom', 'slideFromTopLeft', 'slideFromTopRight', 'slideFromBottomLeft', 'slideFromBottomRight', 'flipX', 'flipY'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>transitionTimingFunction</code></td>
      <td>CSS timing function used with transitions.
      <b>Note:</b> transitionImages must be set to true.<br>
        <br><b>Example:</b> <code>'ease-in</code>
        <br><b>Default value:</b> <code>'cubic-bezier(.17,.67,.35,.96)'</code>
        <br><b>Possible values:</b> <code>'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(n,n,n,n)'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>animations</code></td>
      <td>Array value containing strings defining what animations to perform.
      <b>Note:</b> backgroundAnimationEnabled must be set to true.<br>
        <br><b>Example:</b> <code>'ease-in</code>
        <br><b>Default value:</b> <code>['slide', 'zoomOut', 'zoomIn']</code>
        <br><b>Possible values:</b> <code>'slide', 'zoomOut', 'zoomIn'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>changeImageOnResume</code></td>
      <td>Should the image be changed in the moment the module resumes after it got hidden?
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    </tbody>
</table>

### How to manually exclude images from a folder

Create a file called `excludeImages.txt` that you put in the same folder as the images you want to exclude (one for each directory!)

Add the filenames you want to exclude to the file, one filename per row.
That's it!

## Developer commands

- `npm run lint` - Run linting and formatter checks.
- `npm run lint:fix` - Fix linting and formatter issues.
- `npm test` - Run unit tests.
- `npm run test:watch` - Run tests in watch mode.
- `npm run test:coverage` - Run tests with coverage report.
- `npm run install:prod` - Install only production dependencies (excludes dev dependencies like linters and test frameworks).
