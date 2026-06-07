# Serves a pre-built scratch-gui bundle. Run `npm run build` before `docker compose up`.
FROM nginx:alpine
COPY packages/scratch-gui/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
