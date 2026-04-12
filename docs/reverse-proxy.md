# Reverse Proxy Support

The canonical reverse proxy guide now lives on the public documentation site:

[TaskBandit reverse proxy guide](https://kriziw.github.io/taskbandit/reverse-proxy.html)

## Nginx Proxy Manager Quick Start

If you use the Nginx Proxy Manager UI, create two proxy hosts:

1. `taskbandit.example.com` -> `http://taskbandit-web:4173` (or your Docker host IP on port `4173`)
2. `api.taskbandit.example.com` -> `http://taskbandit-server:8080` (or your Docker host IP on port `8080`)

Important details:

- keep `/admin` on the same web host as `/`; do not create a separate proxy host just for `/admin`
- set `TASKBANDIT_PUBLIC_WEB_BASE_URL` to your web domain and `TASKBANDIT_PUBLIC_API_BASE_URL` to your API domain
- if TaskBandit is behind a public HTTPS proxy, leave the simplified env model in place and only fall back to the legacy overrides when you intentionally need custom behavior
- if Nginx Proxy Manager runs in Docker, `localhost` usually points to the Nginx Proxy Manager container itself, not to TaskBandit, so prefer the Docker service name or the Docker host IP

Useful checks after proxy setup:

- `https://taskbandit.example.com/` -> client login
- `https://taskbandit.example.com/admin/` -> admin login
- `https://api.taskbandit.example.com/health` -> API health check

Keep this repository-local file as a lightweight pointer plus a quick operational note so source references do not break.
