# Reverse Proxy Support

TaskBandit is designed to run behind a reverse proxy such as Nginx or Traefik.

## Backend Behavior

When `TaskBandit:ReverseProxy:Enabled=true`, the ASP.NET server will:

- trust `X-Forwarded-For`
- trust `X-Forwarded-Proto`
- trust `X-Forwarded-Host`
- optionally apply a configured `PathBase`

Relevant config:

```json
{
  "TaskBandit": {
    "ReverseProxy": {
      "Enabled": true,
      "PathBase": ""
    }
  }
}
```

Environment variable equivalents:

- `TaskBandit__ReverseProxy__Enabled=true`
- `TaskBandit__ReverseProxy__PathBase=/taskbandit`

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

- `TaskBandit__ReverseProxy__Enabled=true`
- `TaskBandit__ReverseProxy__PathBase=/taskbandit`

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
- If you later host the React web app from the ASP.NET server, the same proxy setup will still apply.
- In production, tighten trusted proxy configuration if you know the exact proxy network ranges.

