# Development Setup Guide - Web Application

This guide covers the development environment setup for MyHomeGames Web Application.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. The `.env` file is committed to the repository:
   - On the `0.X.X-SNAPSHOT` branch: development configuration (`VITE_API_TOKEN=changeme`, `VITE_API_BASE=http://127.0.0.1:4000`)
   - On the `main` branch: contains production configuration

   `VITE_API_BASE` is the local Node URL for `/tunnel/*` control only. Once cloudflared connects, app API calls use the public tunnel URL (same as production).

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Running with HTTPS

### Configure Web Application for HTTPS

To use HTTPS in the web application, add to your `.env` file:

```env
# Use HTTPS API
VITE_API_BASE=https://localhost:41440

# Enable HTTPS for Vite dev server (optional)
VITE_HTTPS_ENABLED=true
```

Then start the web application:

```bash
npm run dev
```

The web application will be available at:
- **HTTP**: `http://localhost:5173` (default)
- **HTTPS**: `https://localhost:5173` (if `VITE_HTTPS_ENABLED=true`)

### Browser Security Warning

When using self-signed certificates, your browser will show a security warning. This is normal for development:
1. Click "Advanced" or "Show Details"
2. Click "Proceed to localhost" or "Accept the Risk and Continue"

For a better development experience without warnings, you can use `mkcert` to generate trusted certificates:

```bash
# Install mkcert (macOS)
brew install mkcert
mkcert -install

# Generate trusted certificates
cd certs
mkcert localhost 127.0.0.1
mv localhost+1.pem cert.pem
mv localhost+1-key.pem key.pem
```

**Important**: HTTPS in development is optional. Use HTTPS when testing self-signed certificate acceptance or mixed-content scenarios with the local API.

## Development Configuration

### Environment Variables

For development, the web application uses:

- `VITE_API_BASE` - Local Node URL for `/tunnel/*` control (connect, status, logout)
  - Development: `http://127.0.0.1:4000`
  - App API calls use the public tunnel URL after cloudflared connects (not this URL)
- `VITE_API_TOKEN` - Optional dev token for `/auth/me` (development only)
  - Development: `changeme`
  - Does not bypass the Cloudflare tunnel
- `VITE_HTTPS_ENABLED` (default: `false`) - Enable HTTPS for Vite dev server (`true`/`false`)
  - When enabled, Vite serves the app over HTTPS using certificates from the `certs/` directory
  - Recommended when using Cloudflare tunnel (SPA on `https://localhost:5173`, API on tunnel subdomain)

- `VITE_GITHUB_REPO` (optional) - GitHub repository in the form `owner/repo` (e.g. `MyHomeGames/MyHomeGames`)
  - When set, the app periodically checks the [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github) API
  - If a release with a version greater than the current app version exists, a yellow notification icon appears in the header
  - Clicking the icon opens a dropdown to download the server package for your operating system (Windows, macOS, Linux)

**Note**: `VITE_API_BASE` is required. The application will not start without it.

## Development Authentication

In development mode, you can set `VITE_API_TOKEN` to simulate a dev user on `GET /auth/me`.

The `.env` file on the `0.X.X-SNAPSHOT` branch already contains:
```bash
VITE_API_TOKEN=changeme
VITE_API_BASE=http://127.0.0.1:4000
```

**Note**: Do not set `VITE_API_TOKEN` in production.

## Building for Production

To create a production bundle:

```bash
# Build the application
npm run build
```

This will create an optimized production build in the `docs/app` directory.

**Deployment**: After building, commit and push the `docs/app` directory to deploy the application. The build process updates `docs/app` directly, so no additional copy step is needed.

### Preview Production Build Locally

To preview the production build locally:

```bash
# After building, preview the production build
npm run preview
```

This will serve the production build locally at `https://localhost:5173/app/` (same port as dev; HTTPS when `VITE_HTTPS_ENABLED=true`).

## Troubleshooting

### Web application won't start
- Verify `VITE_API_BASE` is set in `.env`
- Check that the server is running on the configured port
- Ensure Node.js version is v18 or higher

### Authentication issues
- Verify `VITE_API_TOKEN` matches the server's `API_TOKEN` (development only, for `/auth/me`)
- Review browser console for API errors

### HTTPS issues
- **Certificate errors**: Verify that `certs/key.pem` and `certs/cert.pem` exist and are readable
- **Browser security warning**: This is normal with self-signed certificates. Accept the exception or use `mkcert` for trusted certificates
- **Vite HTTPS not working**: Verify `VITE_HTTPS_ENABLED=true` in `.env` and that certificates are accessible from the `certs/` directory
