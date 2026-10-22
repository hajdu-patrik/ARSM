# syntax=docker/dockerfile:1
# WebUI image: Nginx serves the Vite build and proxies /api/* (one host name, because the CSRF cookie is
# host-only). PUBLIC_URL is baked in at build time.

FROM node:26-bookworm-slim AS build
WORKDIR /src
COPY app/AutoService.WebUI/package.json app/AutoService.WebUI/package-lock.json app/AutoService.WebUI/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY app/AutoService.WebUI/ ./
ARG PUBLIC_URL
RUN test -n "$PUBLIC_URL" || { echo "Build arg PUBLIC_URL is required (the public https origin)." >&2; exit 1; }
ENV VITE_API_URL=$PUBLIC_URL \
    VITE_SITE_URL=$PUBLIC_URL
RUN npm run build
# A <meta> CSP cannot carry frame-ancestors, so the build's exact policy becomes a response header too.
COPY deploy/extract-csp.mjs ./
RUN node extract-csp.mjs dist/index.html > csp.conf

# Unprivileged image (runs as uid 101, listens on 8080); /etc/nginx/templates is rendered with the
# environment (PORT, API_UPSTREAM) at start-up.
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/static-headers.conf /etc/nginx/snippets/static-headers.conf
COPY deploy/nginx/api-proxy.conf /etc/nginx/snippets/api-proxy.conf
COPY --from=build /src/csp.conf /etc/nginx/snippets/csp.conf
COPY --from=build /src/dist /usr/share/nginx/html
ENV PORT=8080 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
EXPOSE 8080
