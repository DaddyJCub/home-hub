# HomeHub on Unraid (Docker)

This guide covers running HomeHub as a container on Unraid with persistent appdata and sane defaults.

## Image build (optional)
```
docker build -t homehub:latest .
```
You can also use this Dockerfile in an Unraid “Custom” template and let Unraid build or pull your own registry tag.

## Container configuration
- **Ports**: map container `4173` to any host port (e.g., `4173`). Example: `4173:4173/tcp`.
- **Volumes**: map a single persistent appdata path to `/data` (even if currently unused for writes). Example: `/mnt/user/appdata/homehub:/data`.
- **Environment**
  - `PORT` (default `4173`) – HTTP port inside the container.
  - `HOST` (default `0.0.0.0`) – leave default to bind all interfaces.
  - `DATA_DIR` (default `/data`) – persistent path inside container.
  - `PUID` / `PGID` – optional; run container with `--user ${PUID}:${PGID}` if you want host ownership consistency.

## Run examples
```
docker run -d \
  --name homehub \
  -p 4173:4173 \
  -v /mnt/user/appdata/homehub:/data \
  --env-file .env \
  homehub:latest
```
Or with explicit UID/GID:
```
docker run -d \
  --name homehub \
  -p 4173:4173 \
  -v /mnt/user/appdata/homehub:/data \
  -e PORT=4173 -e HOST=0.0.0.0 \
  --user 1000:1000 \
  homehub:latest
```

## Healthcheck
The container exposes `HEALTHCHECK` against `http://127.0.0.1:${PORT}/healthz.txt`. Unraid will show container health accordingly.

## Reverse proxy (optional)
- When placing behind Nginx/Traefik/Caddy, proxy to the mapped host port (e.g., 4173).
- Preserve `Accept-Encoding` and static caching headers for best performance.
- If using HTTPS offload, ensure the proxy forwards `Host` and `X-Forwarded-*` headers.

## Upgrades
1. Pull/build the new image.
2. Restart the container. The app is static; no migrations required. `/data` is preserved across upgrades.
3. Verify health: `docker inspect --format='{{json .State.Health}}' homehub`.

## Logging
The app logs to STDOUT/STDERR by default; Unraid will capture container logs. No logs are written inside the container except standard output.

## Notes
- The app is a static build served by `serve`; no server-side state. `/data` is reserved for any future runtime needs and to satisfy Unraid appdata expectations.
- Keep `PORT`/`HOST` defaults unless you have port conflicts.***
