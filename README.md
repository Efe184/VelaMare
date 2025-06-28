# # VelaMare - Underwater Three.js Scene

An immersive underwater 3D experience built with Three.js and TypeScript.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VelaMare
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── core/           # Application start and base scene
├── managers/       # Config builders (renderer, light, camera, controls)
├── services/       # Time-based behavior (animation, movement, weather, fish)
├── loaders/        # Async loading for models, textures, HDRI
├── ui/            # GUI elements (dat.GUI, buttons)
├── shaders/       # All .glsl/.vert/.frag files
└── assets/        # All external resources (textures, models, HDRI)
```

### Coding Standards

- **TypeScript only** - No JavaScript files
- **Max 300 lines per file** - Separate logic into clear services
- **Naming conventions:**
  - Folders/files: `kebab-case`
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

## 🎯 Current Status

✅ Initial Three.js setup complete
✅ TypeScript configuration
✅ Vite build system
✅ Project structure established
✅ Basic managers (Renderer, Camera, Light)
✅ Gray scene with test objects rendering

## 🔧 Tech Stack

- **Three.js** - 3D graphics library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📁 Architecture

The project follows a modular architecture:

- **Managers**: Handle Three.js component configuration and setup
- **Services**: Contain time-based behaviors and animations  
- **Loaders**: Manage async resource loading
- **Core**: Application initialization and main scene logic
- **UI**: User interface and control elements
- **Shaders**: Reusable GLSL shader programs

## 🚧 Next Steps

- Add 3D model loading
- Implement underwater effects
- Create marine life animations
- Add user interactions
- Develop realistic water simulation