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

## Notes

- Keep TLS termination at the proxy layer unless you have a specific reason not to.
- If you later serve the web UI from the same server image, the same proxy setup will still apply.
- If you deploy under a subpath, the API and Swagger endpoints will be exposed under that same base path.
