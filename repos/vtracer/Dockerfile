# VTracer webapp — multi-stage build
# 1) rust + wasm-pack: compile the webapp wasm core (webapp/src) to
#    webapp/pkg (wasm-pack default out-dir) — the app's package.json
#    dependency "vtracer": "file:../pkg" resolves from webapp/app/ to this
#    location, exactly like upstream's documented flow (cd webapp &&
#    wasm-pack build).
# 2) node: npm install (links node_modules/vtracer -> ../../pkg) and
#    webpack-bundle the frontend (webapp/app)
# 3) nginx-unprivileged: serve the static result on 8080
#
# Upstream: https://github.com/visioncortex/vtracer (MIT OR Apache-2.0)
# The webapp is excluded from the upstream Cargo workspace, see
# webapp/Readme.md.

FROM rust:1-alpine AS wasm
RUN apk add --no-cache musl-dev wget
RUN wget -qO- https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
WORKDIR /webapp
COPY webapp/Cargo.toml webapp/Cargo.lock* ./
COPY webapp/src ./src
# webapp is a standalone crate (excluded from the upstream workspace)
RUN wasm-pack build --release --target bundler

FROM node:22-alpine AS bundle
WORKDIR /webapp
COPY --from=wasm /webapp/pkg ./pkg
COPY webapp/app/package.json webapp/app/package-lock.json* ./app/
COPY webapp/app/webpack.config.js webapp/app/bootstrap.js webapp/app/index.js webapp/app/index.html ./app/
# `assets` symlinks to ../../docs/assets in upstream (sample images the UI
# shows); we copy the real files to the same relative location
COPY docs/assets ./app/assets
WORKDIR /webapp/app
RUN npm ci --ignore-scripts || npm install --ignore-scripts; \
    npx webpack --mode production

FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bundle /webapp/app/dist /usr/share/nginx/html/
COPY html/404.html /usr/share/nginx/html/404.html
COPY --from=bundle /webapp/app/index.html /usr/share/nginx/html/
COPY docs/assets /usr/share/nginx/html/assets/
EXPOSE 8080