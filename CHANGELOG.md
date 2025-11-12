# Changelog

All notable changes to MMM-SynPhotoSlideshow are documented in this file.

## [2.0.0] - 2024 - TypeScript Refactoring Release

### Major Changes

#### TypeScript Migration

- **Complete rewrite in TypeScript** - Entire codebase converted from JavaScript to TypeScript
- **Strict type checking** - TypeScript strict mode enabled for maximum type safety
- **Shared type definitions** - Centralized interfaces in `src/types.ts`
- **Better IDE support** - Enhanced autocomplete, refactoring, and error detection
- **Compile-time safety** - Catch errors before runtime

#### Architecture Refactoring

**Frontend:**

- Extracted `ModuleController.ts` (502 lines) from main module
- Reduced `MMM-SynPhotoSlideshow.ts` to 151 lines (77% reduction from 662 lines)
- Clean separation: thin MagicMirror adapter delegates to business logic controller
- Framework-independent business logic, fully testable

**Backend:**

- Extracted `SlideshowController.ts` (295 lines) from node helper
- Reduced `node_helper.ts` to 104 lines (65% reduction from 293 lines)
- Orchestrates 7 backend services via dependency injection
- Testable without NodeHelper framework

**Frontend Modules:**

- `ConfigValidator.ts` - Configuration validation and normalization
- `ImageHandler.ts` - Image display, orientation, animations
- `UIBuilder.ts` - UI elements, gradients, progress bars, image info
- `TransitionHandler.ts` - Transition effects and DOM cleanup
- `ModuleController.ts` - Frontend business logic controller

**Backend Modules:**

- `SlideshowController.ts` - Backend business logic controller
- `ImageListManager.ts` - Image list management and history
- `TimerManager.ts` - Slideshow and refresh timer management
- `ImageProcessor.ts` - Image processing with Sharp
- `ImageCache.ts` - Disk-based LRU image caching
- `SynologyManager.ts` - Synology Photos integration
- `SynologyPhotosClient.ts` - Synology Photos API client
- `ConfigLoader.ts` - Environment variable and .env file support
- `MemoryMonitor.ts` - Memory usage tracking
- `Logger.ts` - Centralized logging utility

#### Comprehensive Testing

- **490+ unit tests** across 15 test suites
- **100% test pass rate** in continuous integration
- **High coverage** of critical code paths
- **Typed mocks** for all external dependencies
- **Integration tests** for workflow verification
- Backend: 10 test files with 444 tests
- Frontend: 5 test files with 46 tests

#### Complexity Reduction

**socketNotificationReceived Refactoring:**

- Reduced from 102-line if-else chain to 30-line handler map
- Extracted 12 focused handler methods
- Each notification type has dedicated, testable method
- Significantly reduced cyclomatic complexity

**updateImageInfo Refactoring:**

- Reduced from 53-line monolithic method to 11-line orchestrator
- Extracted 5 helper methods with single responsibilities
- Improved testability and maintainability
- Self-documenting method names

### New Features

#### Image Caching System

- **Disk-based LRU cache** for processed images
- **Configurable size limits** - Default 500MB, adjustable
- **Background preloading** - Preload next 10 images (configurable)
- **Automatic eviction** - LRU algorithm manages cache size
- **Hash-based keys** - Efficient cache lookup
- **Dramatically improved performance** on low-CPU devices
- Configuration options:
  - `enableImageCache: true` (default)
  - `imageCacheMaxSize: 500` (MB)
  - `imageCachePreloadCount: 10` (images)

#### Environment Variable Support

- **Secure credential storage** via `.env` files
- **20+ configuration options** available as environment variables
- **Environment variables override config.js** for deployment flexibility
- **Docker and container friendly**
- **ConfigLoader** automatically loads `.env` from module directory
- **Logging** confirms when `.env` file is loaded
- **Template provided** in `.env.example`

#### Memory Monitoring

- **Automatic memory tracking** via MemoryMonitor
- **Heap usage statistics** logged periodically
- **RSS monitoring** for total memory footprint
- **Performance tuning data** for optimization

### Improvements

#### Logging Optimization

- **Reduced log verbosity** - Changed routine operations to DEBUG level
- **INFO level** reserved for significant events
- **DEBUG level** for routine operations (timers, cache hits, processing)
- **Better troubleshooting** - Important events easier to spot
- **Reduced disk I/O** - Less log file bloat
- Updated files:
  - `TimerManager.ts` - 7 changes
  - `ImageProcessor.ts` - 3 changes
  - `SlideshowController.ts` - Multiple changes

#### Bug Fixes

- Fixed `stopRefreshTimer` using `clearInterval` instead of `clearTimeout`
- Added handler for `BACKGROUNDSLIDESHOW_IMAGE_UPDATED` notification
- Improved error handling across all modules
- Better async/await patterns

#### Documentation

- **Completely updated** ARCHITECTURE.md with TypeScript structure
- **Completely updated** IMPLEMENTATION_NOTES.md with all changes
- **Added** this CHANGELOG.md
- **Comprehensive inline documentation** with JSDoc comments
- **Type definitions** serve as inline documentation

### Build System

#### New Build Process

- **Rollup bundler** for TypeScript compilation
- **Separate builds** for frontend and backend
- **SASS preprocessing** for styles
- **Babel transpilation** for browser compatibility
- **Source maps** for debugging

#### Development Commands

- `npm run build` - Build both frontend and backend
- `npm run build:watch` - Build in watch mode for development
- `npm test` - Run all 490+ tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix code quality issues
- `npm run install:prod` - Production-only dependencies

#### Code Quality

- **ESLint** with TypeScript support
- **Prettier** for consistent formatting
- **Husky** git hooks for pre-commit checks
- **lint-staged** for efficient pre-commit linting
- **Strict TypeScript compiler options**

### Performance

#### Caching Benefits

- **Reduced network bandwidth** - Images cached locally
- **Faster load times** - Especially on low-CPU devices
- **Background preloading** - Next images ready immediately
- **Configurable cache size** - Balance disk space vs performance

#### Memory Optimization

- **Memory monitoring** prevents leaks
- **Efficient image processing** with Sharp
- **Controlled preloading** limits memory usage
- **Automatic cache cleanup**

### Security

#### Credential Management

- **Never commit credentials** - .env in .gitignore
- **Environment variables** override config.js
- **Secure by default** - Credentials separate from code
- **Docker secrets compatible**

#### Type Safety

- **Compile-time checks** prevent type errors
- **Interface enforcement** ensures correct API usage
- **Null safety** with strict TypeScript mode

### Breaking Changes

**None** - 100% backward compatible:

- Existing configurations work unchanged
- Same configuration file format
- Same notification interface
- Same visual appearance
- All existing features preserved

### Migration Guide

#### For Existing Users

No changes required! Your existing configuration will work as-is.

**Optional improvements:**

1. **Use .env for credentials:**

   ```bash
   cd ~/MagicMirror/modules/MMM-SynPhotoSlideshow
   cp .env.example .env
   nano .env  # Add your credentials
   ```

2. **Enable image caching:**

   ```javascript
   config: {
     enableImageCache: true,
     imageCacheMaxSize: 1000,  // 1GB
     imageCachePreloadCount: 20
   }
   ```

3. **Update dependencies:**
   ```bash
   cd ~/MagicMirror/modules/MMM-SynPhotoSlideshow
   git pull
   npm install
   ```

### Technical Metrics

#### Code Size

- **Frontend adapter**: 662 → 151 lines (77% reduction)
- **Backend adapter**: 293 → 104 lines (65% reduction)
- **Total source**: ~3,252 lines TypeScript
- **Total tests**: ~4,000+ lines
- **Test coverage**: 490+ tests across 15 suites

#### Complexity Reduction

- **socketNotificationReceived**: 102 → 30 lines + handlers
- **updateImageInfo**: 53 → 11 lines + helpers
- **Average method length**: Significantly reduced
- **Cyclomatic complexity**: Dramatically improved

#### Quality

- **TypeScript strict mode**: Enabled
- **ESLint**: Zero errors
- **Prettier**: All files formatted
- **Test pass rate**: 100%
- **Build warnings**: Only expected Node.js built-in warnings

### Dependencies

#### New Dependencies

- `@types/jest` - TypeScript definitions for Jest
- `@types/node` - TypeScript definitions for Node.js
- `@typescript-eslint/*` - ESLint TypeScript support
- `typescript` - TypeScript compiler
- `ts-jest` - Jest TypeScript support
- `rollup` and plugins - Build system
- `dotenv` - Environment variable support

#### Updated Dependencies

- All dependencies updated to latest stable versions
- Security patches applied
- Compatibility verified

### Acknowledgments

Based on:

- [MMM-ImageSlideshow](https://github.com/AdamMoses-GitHub/MMM-ImageSlideshow/)
- [MMM-BackgroundSlideshow](https://github.com/darickc/MMM-BackgroundSlideshow/)

### Links

- **Repository**: https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow
- **Documentation**: See docs/ folder
- **Issues**: https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/issues

[2.0.0]: https://github.com/spydersoft-consulting/MMM-SynPhotoSlideshow/releases/tag/v2.0.0
