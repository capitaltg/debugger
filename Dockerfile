FROM nginx:1.31-alpine3.24-slim

COPY ./dist/ /usr/share/nginx/html

COPY ./docker/nginx/starter-kit.conf /etc/nginx/conf.d/