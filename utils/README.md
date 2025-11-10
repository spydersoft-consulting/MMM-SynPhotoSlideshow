# Utility Modules

The MMM-SynPhotoSlideshow module uses a set of utility modules to organize code into manageable, focused components.

## Directory Structure

```
utils/
├── frontend/           # Browser-side utilities (loaded via getScripts())
│   ├── ConfigValidator.js
│   ├── ImageHandler.js
│   ├── UIBuilder.js
│   └── TransitionHandler.js
├── backend/            # Node.js utilities (loaded via require())
│   ├── Logger.js
│   ├── ConfigLoader.js
│   ├── ImageListManager.js
│   ├── TimerManager.js
│   ├── ImageProcessor.js
│   ├── ImageCache.js
│   ├── MemoryMonitor.js
│   ├── SynologyManager.js
│   └── SynologyPhotosClient.js
└── README.md
```

## Frontend Utilities (Browser)

Located in `utils/frontend/`. These modules run in the browser and handle UI and display logic. They are loaded via `getScripts()` in `MMM-SynPhotoSlideshow.js` and cannot use Node.js `require()` statements.

### ConfigValidator.js

**Purpose:** Configuration validation and normalization

**Responsibilities:**

- Validates required configuration parameters
- Normalizes image info settings
- Sets up default transition speeds
- Ensures proper configuration format

**Key Methods:**

- `validateConfig(config)` - Validates and normalizes the entire config object
- `checkRequiredConfig(config)` - Checks for required parameters like `synologyUrl`

**Usage:** Static class used during module initialization

---

### ImageHandler.js

**Purpose:** Image display, sizing, and orientation management

**Responsibilities:**

- Creates image div elements
- Detects portrait vs landscape orientation
- Applies fit modes (letterboxing for portrait/landscape)
- Handles background animations (slide, zoom)
- Manages EXIF orientation transformations

**Key Methods:**

- `createImageDiv()` - Creates a new image div with default styling
- `applyFitMode(imageDiv, image)` - Applies portrait-mode or landscape-mode classes
- `applyAnimation(imageDiv, image)` - Applies slide/zoom animations
- `applyExifOrientation(imageDiv, image)` - Handles EXIF orientation transforms
- `getImageTransformCss(exifOrientation)` - Returns CSS transform for EXIF orientation

**Usage:** Instantiated in main module with config

---

### UIBuilder.js

**Purpose:** UI element creation and management

**Responsibilities:**

- Creates gradient overlays
- Manages image info display
- Handles progress bar creation and updates
- Formats and displays image metadata

**Key Methods:**

- `createGradientDiv(direction, gradient, wrapper)` - Creates linear gradient overlays
- `createRadialGradientDiv(type, gradient, wrapper)` - Creates radial gradient overlays
- `createImageInfoDiv(wrapper)` - Creates the image info display area
- `createProgressbarDiv(wrapper, slideshowSpeed)` - Creates progress bar
- `restartProgressBar()` - Restarts progress bar animation
- `updateImageInfo(imageInfoDiv, imageinfo, imageDate, translate)` - Updates image metadata display

**Usage:** Instantiated in main module with config

---

### TransitionHandler.js

**Purpose:** Image transition effects management

**Responsibilities:**

- Creates transition div elements with animations
- Cleans up old images from DOM
- Applies transition effects (slide, flip, fade, etc.)

**Key Methods:**

- `createTransitionDiv()` - Creates transition wrapper with animation
- `cleanupOldImages(imagesDiv)` - Removes old images and fades current image

**Usage:** Instantiated in main module with config

---

## Backend Utilities (Node.js)

Located in `utils/backend/`. These modules run in Node.js and handle server-side operations. They are loaded via `require()` in `node_helper.js` and can use all Node.js APIs.

### Logger.js

**Purpose:** Centralized logging with proper MagicMirror integration

**Responsibilities:**

- Provides singleton logger instance
- Integrates with MagicMirror's Log system
- Falls back to console when Log unavailable
- Supports all log levels (debug, info, warn, error)

**Key Methods:**

- `getLogger()` - Get singleton logger instance
- `debug(message)` - Log debug messages
- `info(message)` - Log info messages
- `warn(message)` - Log warning messages
- `error(message)` - Log error messages

**Usage:** Singleton used throughout backend modules

---

### ConfigLoader.js

**Purpose:** Environment variable and .env file configuration loading

**Responsibilities:**

- Loads configuration from .env files
- Merges environment variables with config
- Parses numeric and boolean values
- Converts array string formats to arrays

**Key Methods:**

- `initialize(config)` - Main entry point to merge config with environment
- `loadEnvFile()` - Load .env file if it exists
- `parseEnvValue(value)` - Parse environment variable strings

**Usage:** Static class used in node_helper during config initialization

---

### ImageListManager.js

**Purpose:** Image list management and tracking

**Responsibilities:**

- Maintains the current image list and index
- Sorts images by name, created date, or modified date
- Shuffles images for random order
- Tracks which images have been shown
- Reads/writes the shown images tracker file
- Handles looping back to beginning of list

**Key Methods:**

- `shuffleArray(array)` - Randomly shuffle an array
- `sortImageList(imageList, sortBy, sortDescending)` - Sort images by various criteria
- `prepareImageList(images, config)` - Prepare final list based on config
- `getNextImage()` - Get next image from the list
- `getPreviousImage()` - Get previous image from the list
- `addImageToShown(imgPath)` - Track shown image
- `resetShownImagesTracker()` - Reset the tracking file
- `isEmpty()` - Check if list is empty

**Usage:** Instantiated in node_helper

---

### TimerManager.js

**Purpose:** Timer management for slideshow and refresh

**Responsibilities:**

- Controls slideshow timer (for advancing images)
- Controls refresh timer (for reloading image list)
- Starts, stops, and restarts timers
- Provides timer status information

**Key Methods:**

- `startSlideshowTimer(callback, interval)` - Start slideshow timer
- `stopSlideshowTimer()` - Stop slideshow timer
- `startRefreshTimer(callback, interval)` - Start refresh timer
- `stopRefreshTimer()` - Stop refresh timer
- `stopAllTimers()` - Stop both timers
- `isSlideshowTimerRunning()` - Check slideshow timer status
- `isRefreshTimerRunning()` - Check refresh timer status

**Usage:** Instantiated in node_helper

---

### ImageProcessor.js

**Purpose:** Image reading, resizing, and processing

**Responsibilities:**

- Reads local image files
- Resizes images using Sharp library
- Downloads images from Synology
- Converts images to base64 for transmission
- Handles different image formats

**Key Methods:**

- `readFile(filepath, callback, imageUrl, synologyClient)` - Main entry point for reading images
- `resizeImage(inputPath, callback)` - Resize image to configured dimensions
- `readFileRaw(filepath, callback)` - Read image without resizing
- `downloadSynologyImage(imageUrl, synologyClient, callback)` - Download from Synology

**Usage:** Instantiated in node_helper with config

---

### SynologyManager.js

**Purpose:** Synology Photos API integration

**Responsibilities:**

- Initializes Synology Photos client
- Handles authentication with Synology
- Finds albums and tags
- Fetches photos from Synology
- Caches Synology client instance

**Key Methods:**

- `fetchPhotos(config)` - Fetch photos from Synology (main entry point)
- `getClient()` - Get Synology client instance
- `getPhotos()` - Get cached photos
- `isInitialized()` - Check if client is initialized

**Usage:** Instantiated in node_helper

---

### SynologyPhotosClient.js

**Purpose:** Low-level Synology Photos API client

**Responsibilities:**

- Authenticates with Synology Photos API
- Manages session IDs and tokens
- Lists albums and finds target albums
- Discovers tags across personal and shared spaces
- Fetches photos from albums and by tags
- Handles space-specific API endpoints (personal vs shared)
- Downloads photos from Synology
- Manages logout and session cleanup

**Key Methods:**

- `authenticate()` - Authenticate with Synology and get session ID
- `findAlbum()` - Find target album by name
- `findTags()` - Find tags by name across spaces
- `fetchPhotos()` - Main entry point to fetch all photos
- `fetchSharedAlbumPhotos()` - Fetch from shared album using token
- `fetchAllPhotos()` - Fetch all photos from personal space
- `fetchAlbumPhotos(albumId)` - Fetch photos from specific album
- `fetchPhotosByTagInSpace(tagId, spaceId)` - Fetch photos by tag in specific space
- `removeDuplicatePhotos(photos)` - Deduplicate photos using synologyId
- `processPhotoList(photos, spaceId)` - Process raw API response into image list
- `getPhotoUrl(photoId, cacheKey, spaceId)` - Generate photo download URL
- `downloadPhoto(photoUrl)` - Download photo binary data
- `logout()` - End Synology session

**Space Architecture:**

- `space_id 0` - Personal space (uses SYNO.Foto.\* APIs)
- `space_id 1` - Shared space (uses SYNO.FotoTeam.\* APIs)
- Same tag names can have different IDs in different spaces

**Usage:** Instantiated by SynologyManager

---

### ImageCache.js

**Purpose:** Local disk caching of downloaded images with automatic size management

**Responsibilities:**

- Manages local filesystem cache for downloaded images
- Automatically limits cache size and evicts old entries
- Pre-loads images in background for improved performance
- Provides cache statistics and management

**Key Methods:**

- `initialize()` - Initialize the cache system
- `get(imageIdentifier)` - Retrieve image from cache
- `set(imageIdentifier, imageData)` - Store image in cache
- `getCacheKey(imageIdentifier)` - Generate hash key for cache lookup
- `preloadImages(images, downloadCallback)` - Background preload images
- `processPreloadQueue(downloadCallback)` - Process preload queue
- `clear()` - Clear all cached images
- `getStats()` - Get cache statistics

**Configuration:**

- `enableImageCache` - Enable/disable caching (default: true)
- `imageCacheMaxSize` - Max cache size in MB (default: 500MB)
- `imageCachePreloadCount` - Number of images to preload (default: 10)

**Benefits:**

- Significantly faster image display on low-CPU devices
- Reduces network traffic for frequently shown images
- Automatic cache management (no manual cleanup needed)
- Background preloading prevents display lag

**Usage:** Instantiated in node_helper when caching is enabled

---

### MemoryMonitor.js

**Purpose:** Memory usage monitoring and cleanup

**Responsibilities:**

- Monitors Node.js process memory usage
- Triggers cleanup callbacks when threshold exceeded
- Provides memory statistics and warnings
- Configurable monitoring interval and threshold

**Key Methods:**

- `start()` - Start memory monitoring
- `stop()` - Stop memory monitoring
- `onCleanupNeeded(callback)` - Register cleanup callback
- `getMemoryUsage()` - Get current memory statistics
- `checkMemory()` - Check memory and trigger cleanup if needed

**Configuration:**

- `enableMemoryMonitor` - Enable/disable monitoring (default: true)
- `memoryMonitorInterval` - Check interval in ms (default: 60000)
- `memoryThreshold` - Cleanup threshold % (default: 0.85)

**Usage:** Instantiated in node_helper when monitoring is enabled

---

## Module Organization

### Frontend Flow

```
MMM-SynPhotoSlideshow.js
├── ConfigValidator (validates config)
├── ImageHandler (handles image display)
├── UIBuilder (creates UI elements)
└── TransitionHandler (manages transitions)
```

### Backend Flow

```
node_helper.js
├── Logger (logging)
├── ConfigLoader (config loading)
├── ImageListManager (manages image list)
├── TimerManager (controls timers)
├── ImageProcessor (processes images)
├── ImageCache (caches images)
├── MemoryMonitor (monitors memory)
└── SynologyManager (Synology integration)
    └── SynologyPhotosClient (API client)
```

## Key Concepts

### Separation of Concerns

Each utility focuses on one specific area, making the codebase:

- Easier to understand
- Simpler to test
- More maintainable
- Less prone to bugs

### Coordinator Pattern

Main files delegate work to utilities:

- Main modules don't implement complex logic
- Utilities handle specific responsibilities
- Clear boundaries between components

### Reusability

Utilities can be:

- Tested independently
- Reused in different contexts
- Modified without affecting other parts
- Extended with new features

## Usage Examples

### Frontend Example

```javascript
// In MMM-SynPhotoSlideshow.js
this.imageHandler = new ImageHandler(this.config);
this.uiBuilder = new UIBuilder(this.config);

// Later in displayImage()
const imageDiv = this.imageHandler.createImageDiv();
const useFitMode = this.imageHandler.applyFitMode(imageDiv, image);
this.uiBuilder.restartProgressBar();
```

### Backend Example

```javascript
// In node_helper.js
this.imageListManager = new ImageListManager();
this.timerManager = new TimerManager();

// Later in getNextImage()
const image = this.imageListManager.getNextImage();
this.timerManager.startSlideshowTimer(callback, interval);
```

## Benefits

1. **Maintainability** - Easy to locate and modify specific functionality
2. **Testability** - Each utility can be tested in isolation
3. **Readability** - Clear organization and naming
4. **Extensibility** - New features can be added to existing utilities
5. **Debugging** - Issues are easier to isolate and fix

## File Structure

```
utils/
├── frontend/                    # Browser-side utilities
│   ├── ConfigValidator.js       # Config validation
│   ├── ImageHandler.js          # Image display
│   ├── UIBuilder.js             # UI elements
│   └── TransitionHandler.js     # Transitions
├── backend/                     # Node.js utilities
│   ├── Logger.js                # Logging
│   ├── ConfigLoader.js          # Config loading
│   ├── ImageListManager.js      # List management
│   ├── TimerManager.js          # Timer control
│   ├── ImageProcessor.js        # Image processing
│   ├── ImageCache.js            # Image caching
│   ├── MemoryMonitor.js         # Memory monitoring
│   ├── SynologyManager.js       # Synology API coordinator
│   └── SynologyPhotosClient.js  # Synology API client
└── README.md                    # This file
```

## Adding New Utilities

When adding new utilities:

1. **Choose the right location** - Frontend (browser) or Backend (Node.js)
2. **Follow naming conventions** - Descriptive class names ending in appropriate suffix
3. **Single responsibility** - Each utility should do one thing well
4. **Document thoroughly** - Include JSDoc comments and examples
5. **Export correctly** - Use proper module exports for Node.js compatibility
6. **Update this README** - Add documentation for the new utility

## Dependencies

- **Frontend utilities** depend on:
  - Browser APIs (DOM, CSS)
  - EXIF.js library
  - MagicMirror Log

- **Backend utilities** depend on:
  - Node.js APIs (fs, child_process)
  - Sharp library (ImageProcessor)
  - Synology Photos client (SynologyManager)
  - MagicMirror Log

## Future Enhancements

The modular structure enables easy additions:

- New image sources (Google Photos, iCloud, etc.)
- New transition effects
- Advanced image processing
- Enhanced caching strategies
- Improved error handling
- Performance optimizations
