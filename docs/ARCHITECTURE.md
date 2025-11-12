# MMM-SynPhotoSlideshow - Architecture Documentation

This document provides an overview of the TypeScript-based modular architecture of MMM-SynPhotoSlideshow.

## Architecture Overview

The module has been completely refactored from JavaScript to TypeScript with a clean separation of concerns:

- **TypeScript source** (`src/` directory) - Organized into frontend and backend modules
- **Compiled output** - `MMM-SynPhotoSlideshow.js` and `node_helper.js` for MagicMirror
- **Controller pattern** - Thin MagicMirror adapters delegate to business logic controllers
- **Dependency injection** - Clean interfaces and testable components
- **Comprehensive testing** - 490+ unit tests with high coverage

## Directory Structure

```
MMM-SynPhotoSlideshow/
├── MMM-SynPhotoSlideshow.js       # Compiled frontend module
├── node_helper.js                  # Compiled backend helper
├── BackgroundSlideshow.css         # Module styles
│
├── src/                            # TypeScript source code
│   ├── MMM-SynPhotoSlideshow.ts   # Frontend adapter (thin wrapper)
│   ├── node_helper.ts              # Backend adapter (thin wrapper)
│   ├── types.ts                    # Shared TypeScript interfaces
│   │
│   ├── frontend/                   # Frontend modules (browser)
│   │   ├── ModuleController.ts     # Main frontend controller
│   │   ├── ConfigValidator.ts      # Configuration validation
│   │   ├── ImageHandler.ts         # Image display and orientation
│   │   ├── UIBuilder.ts            # UI element creation
│   │   ├── TransitionHandler.ts    # Image transitions
│   │   ├── display.scss            # SCSS styles
│   │   └── *.test.ts               # Unit tests
│   │
│   └── backend/                    # Backend modules (Node.js)
│       ├── SlideshowController.ts  # Main backend controller
│       ├── ImageListManager.ts     # Image list management
│       ├── TimerManager.ts         # Timer management
│       ├── ImageProcessor.ts       # Image processing with Sharp
│       ├── ImageCache.ts           # Disk-based image caching
│       ├── SynologyManager.ts      # Synology integration
│       ├── SynologyPhotosClient.ts # Synology Photos API client
│       ├── ConfigLoader.ts         # .env file support
│       ├── MemoryMonitor.ts        # Memory usage tracking
│       ├── Logger.ts               # Backend logging
│       └── *.test.ts               # Unit tests
│
├── translations/                   # Language files
├── tests/                          # Test setup and utilities
└── docs/                           # Documentation
```

## Module Responsibilities

### Frontend (Browser)

#### Main Adapter: `src/MMM-SynPhotoSlideshow.ts` (151 lines)

Thin MagicMirror adapter that:

- Registers module with MagicMirror framework
- Defines default configuration
- Delegates all business logic to ModuleController
- Provides framework callbacks (sendNotification, sendSocketNotification, etc.)

#### Frontend Controller: `src/frontend/ModuleController.ts` (502 lines)

Main business logic controller that:

- Manages module lifecycle (start, suspend, resume)
- Handles all notifications (frontend and socket)
- Coordinates image display workflow
- Manages timer and state
- Delegates to specialized utilities

#### Frontend Utilities:

**ConfigValidator.ts** - Configuration management

- Validates required config parameters
- Normalizes configuration values
- Sets up defaults
- TypeScript type checking

**ImageHandler.ts** - Image display

- Creates image div elements
- Detects portrait vs landscape orientation
- Applies fit modes (letterboxing for portrait images)
- Handles animations (slide, zoom)
- Manages EXIF orientation

**UIBuilder.ts** - UI components

- Creates gradient overlays
- Manages image info display
- Handles progress bar
- Formats image metadata
- Reduced complexity methods

**TransitionHandler.ts** - Transitions

- Creates transition effects
- Manages DOM cleanup
- Applies transition animations

### Backend (Node.js)

#### Main Adapter: `src/node_helper.ts` (104 lines)

Thin MagicMirror node helper adapter that:

- Extends NodeHelper base class
- Routes socket notifications to SlideshowController
- Delegates all business logic to controller
- 65% size reduction from original

#### Backend Controller: `src/backend/SlideshowController.ts` (295 lines)

Main business logic controller that:

- Orchestrates all backend operations
- Manages image fetching workflow
- Coordinates timer and image processing
- Handles pause/play/navigation
- Delegates to specialized utilities

#### Backend Utilities:

**ImageListManager.ts** - List management

- Maintains image list and index
- Sorts and shuffles images
- Tracks shown images
- Handles list looping
- Manages image history

**TimerManager.ts** - Timing control

- Manages slideshow timer
- Manages refresh timer
- Provides timer control methods
- DEBUG-level logging for routine operations

**ImageProcessor.ts** - Image processing

- Reads local image files
- Resizes images using Sharp
- Downloads Synology images
- Converts to base64
- Integrates with ImageCache

**ImageCache.ts** - Image caching

- Disk-based LRU cache for images
- Configurable cache size limits
- Preloading for improved performance
- Automatic cache eviction
- Memory-efficient storage

**SynologyManager.ts** - Synology integration

- Initializes Synology client
- Handles authentication
- Fetches photos from Synology
- Manages Synology client instance
- Supports tags and albums

**SynologyPhotosClient.ts** - Synology API

- Direct API client for Synology Photos
- Supports credential and token authentication
- Album and tag filtering
- Photo metadata and downloads
- Error handling and retries

**ConfigLoader.ts** - Environment configuration

- Loads .env files
- Environment variable support
- Secure credential management
- Fallback to config.js values

**MemoryMonitor.ts** - Memory tracking

- Monitors memory usage
- Logs memory statistics
- Helps with performance tuning

**Logger.ts** - Backend logging

- Centralized logging utility
- Log level management
- Formatted log output

## Data Flow

### Initialization Flow

```
Frontend Module Start (MMM-SynPhotoSlideshow.ts)
    ↓
Create ModuleController with dependencies
    ↓
ModuleController.start()
    ↓
Initialize Frontend Utilities
(ConfigValidator, ImageHandler, UIBuilder, TransitionHandler)
    ↓
Validate Configuration
    ↓
Send REGISTER_CONFIG to Backend
    ↓
Backend Receives Config (node_helper.ts)
    ↓
Delegate to SlideshowController.initialize()
    ↓
Initialize Backend Utilities
(ImageListManager, TimerManager, ImageProcessor, ImageCache, SynologyManager)
    ↓
Load .env Configuration (ConfigLoader)
    ↓
Fetch Photos from Synology (SynologyManager)
    ↓
Prepare Image List (ImageListManager)
    ↓
Start Image Cache Preloading (ImageCache)
    ↓
Send READY notification to Frontend
    ↓
Start Slideshow Timer (TimerManager)
    ↓
Start Refresh Timer (TimerManager)
```

### Image Display Flow

```
Timer Triggers (TimerManager)
    ↓
SlideshowController.getNextImage()
    ↓
Get Next Image (ImageListManager)
    ↓
Check Cache (ImageCache)
    ↓ (cache miss)
Process Image (ImageProcessor)
    ↓
Store in Cache (ImageCache)
    ↓
Preload Next Images (ImageCache background)
    ↓
Send to Frontend (node_helper)
    ↓
Receive Image (ModuleController.socketNotificationReceived)
    ↓
Route to Handler (handleDisplayImage)
    ↓
ModuleController.displayImage()
    ↓
Clean up Old Images (TransitionHandler)
    ↓
Create Transition (TransitionHandler)
    ↓
Create Image Div (ImageHandler)
    ↓
Apply Fit Mode (ImageHandler - portrait detection)
    ↓
Apply Animation (ImageHandler - if not fit mode)
    ↓
Update Progress Bar (UIBuilder)
    ↓
Handle EXIF Data Async (ImageHandler)
    ↓
Update Image Info (UIBuilder.updateImageInfo)
    ↓
Display Image in DOM
```

### Notification Flow

```
Frontend Notification Received
    ↓
ModuleController.notificationReceived()
    ↓
Route to Handler Method
(handleNext, handlePrevious, handlePause, handlePlay, etc.)
    ↓
Send Socket Notification to Backend
    ↓
node_helper.socketNotificationReceived()
    ↓
Delegate to SlideshowController Method
    ↓
Execute Business Logic
    ↓
Send Response to Frontend (if needed)
```

### Refresh Flow

```
Refresh Timer Triggers (TimerManager)
    ↓
SlideshowController (timer callback)
    ↓
Fetch New Photos (SynologyManager)
    ↓
Update Image List (ImageListManager)
    ↓
Maintain Current Position (ImageListManager)
    ↓
Clear Old Cache Entries (ImageCache)
    ↓
Start Preloading New Images (ImageCache)
    ↓
Restart Refresh Timer (TimerManager)
```

## Key Concepts

### TypeScript Migration

The entire codebase has been migrated to TypeScript:

- **Type Safety**: Compile-time type checking prevents runtime errors
- **Interfaces**: Shared types defined in `src/types.ts`
- **Strict Mode**: TypeScript strict mode enabled for maximum safety
- **IDE Support**: Better autocomplete and refactoring support
- **Documentation**: Types serve as inline documentation

### Clean Architecture Patterns

#### 1. Adapter Pattern

MagicMirror framework adapters are thin wrappers:

- `MMM-SynPhotoSlideshow.ts` - 151 lines (was 662 lines)
- `node_helper.ts` - 104 lines (was 293 lines)
- Only handle framework integration
- Delegate all business logic to controllers

#### 2. Controller Pattern

Business logic controllers orchestrate operations:

- `ModuleController.ts` - Frontend business logic (502 lines)
- `SlideshowController.ts` - Backend business logic (295 lines)
- Independent of MagicMirror framework
- Fully testable without framework

#### 3. Dependency Injection

Components receive their dependencies:

- Config is passed to modules that need it
- Callbacks are passed for async operations
- Logger, EXIF, moment injected into controllers
- Modules don't create their own dependencies
- Easier to mock for testing

#### 4. Single Responsibility

Each module focuses on one specific area:

- **Configuration** → ConfigValidator, ConfigLoader
- **Image Display** → ImageHandler
- **UI Elements** → UIBuilder
- **Transitions** → TransitionHandler
- **List Management** → ImageListManager
- **Timing** → TimerManager
- **Image Processing** → ImageProcessor
- **Caching** → ImageCache
- **Synology API** → SynologyManager, SynologyPhotosClient

#### 5. Separation of Concerns

Clear boundaries between different layers:

- **Framework Layer**: Thin adapters (MMM-SynPhotoSlideshow.ts, node_helper.ts)
- **Controller Layer**: Business logic (ModuleController, SlideshowController)
- **Service Layer**: Specialized utilities (ImageHandler, ImageProcessor, etc.)
- **Data Layer**: Configuration, state management

### Complexity Reduction

Recent refactorings to reduce cognitive complexity:

#### socketNotificationReceived Refactoring

- **Before**: 102-line method with if-else chain
- **After**: 30-line orchestrator + 12 focused handler methods
- **Pattern**: Handler map with method extraction
- **Benefits**: Each notification type has dedicated method

#### updateImageInfo Refactoring

- **Before**: 53-line monolithic method with nested logic
- **After**: 11-line orchestrator + 5 helper methods
- **Pattern**: Extract Method refactoring
- **Methods**:
  - `collectImageProperties()` - Property collection loop
  - `getImageProperty()` - Switch statement routing
  - `getDateProperty()` - Date validation
  - `getNameProperty()` - Filename extraction
  - `buildImageInfoHtml()` - HTML construction

### Testing Strategy

Comprehensive test coverage with Jest:

- **490+ unit tests** across 15 test suites
- **Controller tests**: Mock framework dependencies
- **Service tests**: Test business logic in isolation
- **Integration tests**: Verify workflow coordination
- **Mock strategy**: Typed mocks for all external dependencies
- **Coverage**: High coverage of critical paths

Test patterns used:

- Arrange-Act-Assert pattern
- Mock injection for external dependencies
- Async/await for timer-based tests
- Fresh instances to prevent test pollution

## Benefits

### 1. Maintainability

- Changes are localized to specific modules
- Easy to find where specific functionality lives
- Clear boundaries between different concerns
- TypeScript catches errors at compile time
- Reduced cognitive complexity through method extraction

### 2. Testability

- Each module can be tested independently
- 490+ unit tests with high coverage
- Mocking dependencies is straightforward
- Unit tests can focus on specific functionality
- Controllers are framework-independent and fully testable

### 3. Readability

- Main files are much shorter and clearer (65-77% reduction)
- Each module has a clear, focused purpose
- Code organization mirrors conceptual organization
- TypeScript types serve as documentation
- Extracted methods with self-documenting names

### 4. Extensibility

- New features can be added to existing modules
- New modules can be created without affecting others
- Easy to swap implementations
- Clean interfaces enable plugin architecture

### 5. Code Reuse

- Modules can potentially be reused in other contexts
- Common patterns are centralized
- DRY principle is maintained
- Utilities are framework-agnostic

### 6. Performance

- Image caching reduces network calls
- Preloading improves responsiveness
- Memory monitoring prevents leaks
- Optimized logging reduces overhead

### 7. Security

- Environment variable support for credentials
- .env file support via ConfigLoader
- Credentials never in config.js
- TypeScript prevents type-related security issues

## File Size Comparison

### Before Refactoring (JavaScript):

- MMM-SynPhotoSlideshow.js: ~662 lines
- node_helper.js: ~293 lines
- utils/ helpers: ~800 lines
- **Total: ~1755 lines in mixed structure**

### After Refactoring (TypeScript):

**Source Files:**

- MMM-SynPhotoSlideshow.ts: 151 lines (77% reduction)
- node_helper.ts: 104 lines (65% reduction)
- ModuleController.ts: 502 lines (frontend controller)
- SlideshowController.ts: 295 lines (backend controller)
- Frontend modules: ~800 lines (5 files)
- Backend modules: ~1400 lines (9 files)
- **Source Total: ~3252 lines**

**Test Files:**

- Test files: ~4000+ lines
- 15 test suites
- 490+ tests
- High coverage

**Key Metrics:**

- ✅ 77% reduction in frontend adapter
- ✅ 65% reduction in backend adapter
- ✅ 100% TypeScript with strict mode
- ✅ 490+ unit tests (100% passing)
- ✅ Clean separation of concerns
- ✅ Fully documented interfaces
- ✅ Reduced cognitive complexity

While total source lines increased due to:

- Separate module structure (class definitions, exports)
- Comprehensive TypeScript interfaces
- Extensive comments and JSDoc
- Better error handling
- Additional features (caching, monitoring)

The code is now:

- ✅ Much more organized and structured
- ✅ Easier to understand and navigate
- ✅ Simpler to maintain and extend
- ✅ Better documented with types
- ✅ Fully testable with high coverage
- ✅ Type-safe and less error-prone
- ✅ More performant with caching

## Usage Notes

### For Developers

When making changes to the TypeScript source:

#### Build Process

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint and format
npm run lint
npm run lint:fix
```

#### Where to Make Changes

**Frontend issues:**

1. **Display problems** → `src/frontend/ImageHandler.ts`
2. **UI elements** → `src/frontend/UIBuilder.ts`
3. **Transitions** → `src/frontend/TransitionHandler.ts`
4. **Configuration** → `src/frontend/ConfigValidator.ts`
5. **Module logic** → `src/frontend/ModuleController.ts`
6. **Framework integration** → `src/MMM-SynPhotoSlideshow.ts`

**Backend issues:**

1. **Image processing** → `src/backend/ImageProcessor.ts`
2. **Synology API** → `src/backend/SynologyPhotosClient.ts` or `SynologyManager.ts`
3. **Caching** → `src/backend/ImageCache.ts`
4. **Timing** → `src/backend/TimerManager.ts`
5. **List management** → `src/backend/ImageListManager.ts`
6. **Backend logic** → `src/backend/SlideshowController.ts`
7. **Framework integration** → `src/node_helper.ts`
8. **Environment config** → `src/backend/ConfigLoader.ts`

**Testing:**

- Add tests in corresponding `*.test.ts` files
- Follow existing patterns (Arrange-Act-Assert)
- Mock external dependencies
- Aim for high coverage of critical paths

#### TypeScript Patterns Used

**Interfaces for configuration:**

```typescript
interface ModuleConfig {
  synologyUrl: string;
  slideshowSpeed: number;
  // ...
}
```

**Dependency injection:**

```typescript
constructor(
  config: ModuleConfig,
  callbacks: NotificationCallbacks,
  Log: LoggerInterface
) {
  this.config = config;
  this.callbacks = callbacks;
  this.Log = Log;
}
```

**Handler maps for complexity reduction:**

```typescript
const handlers: Record<string, () => void> = {
  NOTIFICATION_NAME: () => this.handleMethod()
  // ...
};
```

### For Users

The TypeScript refactoring is transparent to users:

- Same configuration format in `config.js`
- Same functionality and features
- Same user experience
- Better performance with caching
- Better reliability with type safety

#### Environment Variables

New `.env` file support for secure credential storage:

```bash
# Copy example
cp .env.example .env

# Edit with your credentials
nano .env
```

See README.md for full `.env` configuration options.

## Technology Stack

### Build Tools

- **TypeScript 5.x** - Type-safe language
- **Rollup** - Module bundler
- **Babel** - JavaScript transpiler
- **SASS** - CSS preprocessor
- **ESLint** - Linting
- **Prettier** - Code formatting

### Testing

- **Jest** - Testing framework
- **ts-jest** - TypeScript Jest support
- **@types/jest** - Jest type definitions

### Runtime Dependencies

- **axios** - HTTP client for Synology API
- **sharp** - Image processing
- **node-cache** - In-memory caching
- **dotenv** - Environment variable support
- **exif-js** - EXIF data extraction

### Development Tools

- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

## Future Roadmap

The modular TypeScript architecture enables:

### 1. Easy Feature Additions

- **New image sources**: Google Photos, iCloud, Dropbox, etc.
- **New transition effects**: Custom CSS animations
- **New display modes**: Grid view, collage mode
- **Face detection**: Smart cropping and framing
- **AI features**: Auto-tagging, smart albums

### 2. Performance Improvements

- **Advanced caching**: Multi-tier cache strategy
- **Image optimization**: WebP conversion, lazy loading
- **Smart preloading**: Predictive image fetching
- **Background processing**: Web workers for image processing

### 3. Enhanced Testing

- **E2E tests**: Playwright or Cypress integration
- **Visual regression**: Screenshot comparison
- **Performance tests**: Load time benchmarks
- **Integration tests**: Full workflow testing

### 4. Better Error Handling

- **Module-specific recovery**: Graceful degradation per component
- **Retry strategies**: Exponential backoff for API calls
- **User notifications**: On-screen error messages
- **Health checks**: Self-monitoring and recovery

### 5. Developer Experience

- **Better documentation**: Interactive examples
- **Plugin system**: Third-party extensions
- **CLI tools**: Configuration helpers
- **Debug mode**: Enhanced logging and diagnostics

### 6. Cloud Integration

- **Multiple NAS support**: Load balance across devices
- **Cloud storage**: Direct integration with cloud providers
- **Sync features**: Offline mode with sync
- **Remote control**: Mobile app integration

## Recent Improvements

### TypeScript Migration (2024)

- Complete conversion from JavaScript to TypeScript
- Strict mode enabled for maximum type safety
- Shared types in `src/types.ts`
- Better IDE support and autocomplete

### Controller Extraction (2024)

- Separated MagicMirror adapters from business logic
- 77% frontend adapter reduction (662 → 151 lines)
- 65% backend adapter reduction (293 → 104 lines)
- Fully testable controllers

### Comprehensive Testing (2024)

- Added 490+ unit tests across 15 test suites
- High coverage of critical paths
- Typed mocks for all dependencies
- Continuous integration with GitHub Actions

### Complexity Reduction (2024)

- Refactored `socketNotificationReceived` (102 → 30 lines + handlers)
- Refactored `updateImageInfo` (53 → 11 lines + helpers)
- Extracted methods following single responsibility
- Reduced cognitive complexity across codebase

### Performance Features (2024)

- Disk-based image caching (ImageCache)
- Background preloading of upcoming images
- Memory monitoring and optimization
- Configurable cache size limits

### Security Features (2024)

- Environment variable support via .env files
- ConfigLoader for secure credential management
- Credentials never stored in config.js
- Docker secrets compatible

### Logging Optimization (2024)

- DEBUG level for routine operations
- INFO level for significant events
- Reduced log file bloat
- Better troubleshooting support

## Documentation

- **Architecture**: This file - system architecture and design patterns
- **README**: `../README.md` - user documentation and configuration
- **Setup Guide**: `SYNOLOGY_SETUP.md` - Synology Photos setup instructions
- **Implementation Notes**: `IMPLEMENTATION_NOTES.md` - technical implementation details
- **Performance**: `PERFORMANCE.md` - performance tuning and optimization
