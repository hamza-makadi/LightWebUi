# LightWebUI

**A minimal, high-performance interface for Ollama.**

LightWebUI is a pure static frontend designed for developers who care about
efficiency. No Node runtime. No Python backend. No heavy containers
sitting idle.

All UI logic runs in your browser. Nginx acts only as a thin proxy to
Ollama. Your RAM is reserved for what matters: the model.

------------------------------------------------------------------------

## Why LightWebUI?

 | Feature | LightWebUI | Typical WebUI |
| :--- | :--- | :--- |
| **Runtime** | Static HTML/JS | Node.js / Python |
| **Idle RAM** | ~10 MB | 200 - 500+ MB |
| **Backend** | None | Persistent App Server |
| **Architecture** | Client-Side | Server-Side Rendering |
| **Data Storage** | Browser LocalStorage | Database |

LightWebUI removes unnecessary layers. The browser handles UI logic. Ollama
handles inference. Nothing else.

------------------------------------------------------------------------

## Architecture

Browser  ──>  Nginx (Static + Proxy)  ──>  Ollama API

-   UI rendering happens client-side\
-   Markdown parsing runs locally\
-   Streaming responses are proxied directly\
-   No database required

------------------------------------------------------------------------

## Features

-   Zero-latency UI (raw JS, optimized CSS)
-   Auto-generated chat titles
-   Theme engine (Midnight Blue, OLED Black, Blossom, Matrix
    Terminal)
-   Optional hardware monitoring (Linux)
-   Local chat storage (browser-based)
-   Docker & non-Docker support

------------------------------------------------------------------------

## Installation

### Method A --- Docker Compose (Recommended)

``` bash
docker compose up -d
```

By default, Docker exposes the UI only to the local machine.

To allow access from another device on your LAN:

``` yaml
ports:
  - "8080:80"
```

To restrict access to the host machine only:

``` yaml
ports:
  - "127.0.0.1:8080:80"
```

------------------------------------------------------------------------

### Method B --- Standard Docker

``` bash
docker build -t lightwebui-ui .
docker run -d -p 8080:80 --add-host=host.docker.internal:host-gateway lightwebui-ui
```

------------------------------------------------------------------------

### Method C --- Static (No Docker)

``` bash
git clone https://github.com/hamza-makadi/LightWebUI.git
cd LightWebUI
python3 -m http.server 8080
```

⚠ If not using the Nginx proxy, you must enable CORS in Ollama:

``` bash
OLLAMA_ORIGINS="*" ollama serve
```

For security, the proxy method is recommended.

------------------------------------------------------------------------

## Security Model

LightWebUI is designed for:

-   Local development
-   LAN environments
-   Personal servers

Security measures include:

-   Content Security Policy (CSP)
-   Referrer-Policy
-   Permissions-Policy
-   Nginx proxy isolation
-   No direct exposure of Ollama port

Important:

LightWebUI does not include authentication or rate limiting. If deploying
publicly, secure it with:

-   Firewall rules
-   Reverse proxy authentication
-   Network isolation

------------------------------------------------------------------------

## Hardware Monitoring (Linux Only for now)

Optional lightweight monitoring:

``` bash
chmod +x monitor.sh
./monitor.sh &
```

Displays live CPU, RAM, and temperature in the UI header.

------------------------------------------------------------------------

## Design Philosophy

LightWebUI follows old-school principles:

-   Minimal dependencies
-   Small attack surface
-   Clear separation of concerns
-   Performance over feature bloat

This project intentionally avoids heavy frameworks.

------------------------------------------------------------------------

## Roadmap

-   [ ] Model installation from UI (`ollama pull`)
-   [ ] Tool / function calling support
-   [ ] Local file reading (RAG)
-   [ ] Optional authentication module

------------------------------------------------------------------------

## Contributing

Pull requests are welcome.

If contributing, prioritize:

-   Performance
-   Simplicity
-   Maintainability

Avoid introducing unnecessary backend layers.

------------------------------------------------------------------------

## License

MIT License
