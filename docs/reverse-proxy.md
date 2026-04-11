# Reverse Proxy Support

TaskBandit is designed to run behind a reverse proxy such as Nginx or Traefik.

## Backend Behavior

When `TASKBANDIT_REVERSE_PROXY_ENABLED=true`, the NestJS server will:

- trust forwarded proxy information at the Express layer
- honor HTTPS and host information supplied by the reverse proxy
- optionally apply a configured path base for subpath hosting

Environment variable equivalents:

- `TASKBANDIT_REVERSE_PROXY_ENABLED=true`
- `TASKBANDIT_REVERSE_PROXY_PATH_BASE=/taskbandit`

Use `PathBase` only if the app is mounted under a subpath instead of a dedicated domain.

Health-check behavior:

- TaskBandit always keeps `/health` at the upstream root, even when `TASKBANDIT_REVERSE_PROXY_PATH_BASE` is set.
- That means subpath hosting proxies should either expose `/health` separately or rely on the container/Docker health check instead of probing `/taskbandit/health`.

## Nginx Example

```nginx
server {
    listen 80;
    server_name taskbandit.example.com;

    location / {
        proxy_pass http://taskbandit-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Subpath example:

```nginx
location = /health {
    proxy_pass http://taskbandit-server:8080/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /taskbandit/ {
    proxy_pass http://taskbandit-server:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

For subpath hosting, also set:

- `TASKBANDIT_REVERSE_PROXY_ENABLED=true`
- `TASKBANDIT_REVERSE_PROXY_PATH_BASE=/taskbandit`

## Traefik Example

```yaml
services:
  server:
    labels:
      - traefik.enable=true
      - traefik.http.routers.taskbandit.rule=Host(`taskbandit.example.com`)
      - traefik.http.routers.taskbandit.entrypoints=websecure
      - traefik.http.routers.taskbandit.tls=true
      - traefik.http.services.taskbandit.loadbalancer.server.port=8080
```

Subpath example:

```yaml
services:
  server:
    labels:
      - traefik.enable=true
      - traefik.http.routers.taskbandit.rule=Host(`example.com`) && PathPrefix(`/taskbandit`)
      - traefik.http.routers.taskbandit.entrypoints=websecure
      - traefik.http.routers.taskbandit.tls=true
      - traefik.http.routers.taskbandit.middlewares=taskbandit-strip
      - traefik.http.middlewares.taskbandit-strip.stripprefix.prefixes=/taskbandit
      - traefik.http.services.taskbandit.loadbalancer.server.port=8080
      - traefik.http.routers.taskbandit-health.rule=Host(`example.com`) && Path(`/health`)
      - traefik.http.routers.taskbandit-health.entrypoints=websecure
      - traefik.http.routers.taskbandit-health.tls=true
      - traefik.http.routers.taskbandit-health.service=taskbandit
```

## Split Frontend Example

When using the split deployment model, route the two services separately:

- API -> `server`
- web -> `web`, with the client UI/PWA at `/` and the admin UI at `/admin`

Nginx example:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://taskbandit-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name taskbandit.example.com;

    location / {
        proxy_pass http://taskbandit-web:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Traefik example:

```yaml
services:
  server:
    labels:
      - traefik.enable=true
      - traefik.http.routers.taskbandit-api.rule=Host(`api.example.com`)
      - traefik.http.routers.taskbandit-api.entrypoints=websecure
      - traefik.http.routers.taskbandit-api.tls=true
      - traefik.http.services.taskbandit-api.loadbalancer.server.port=8080

  web:
    labels:
      - traefik.enable=true
      - traefik.http.routers.taskbandit-web.rule=Host(`taskbandit.example.com`)
      - traefik.http.routers.taskbandit-web.entrypoints=websecure
      - traefik.http.routers.taskbandit-web.tls=true
      - traefik.http.services.taskbandit-web.loadbalancer.server.port=80
```

## Notes

- Keep TLS termination at the proxy layer unless you have a specific reason not to.
- The recommended deployment model is the split layout with a separate API server and shared web container.
- Keep `TASKBANDIT_SERVE_EMBEDDED_WEB=false` for the split deployment and proxy static web traffic to `taskbandit-web` while keeping API traffic on the TaskBandit server.
- For split frontend deployments, set `TASKBANDIT_CORS_ALLOWED_ORIGINS` to the exact web browser origin that should be allowed to call the API.
- If you deploy under a subpath, the web UI, API, and Swagger endpoints will be exposed under that same base path.
- Docker health checks already probe `http://127.0.0.1:${TASKBANDIT_PORT}/health` inside the container, so an external `/health` proxy route is optional unless your own reverse proxy or load balancer needs it.
