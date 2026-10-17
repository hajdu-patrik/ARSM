# syntax=docker/dockerfile:1
# Azure token gate sidecar (GATE_MODE=azure); build context is the repo root. Node major matches web.Dockerfile.

FROM node:26-bookworm-slim
WORKDIR /app
COPY deploy/gate/ /app/
USER node
EXPOSE 8080
ENTRYPOINT ["node", "gate.mjs"]
