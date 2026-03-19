FROM nginx:1.29-alpine

COPY ./dist/ /usr/share/nginx/html

COPY ./docker/nginx/starter-kit.conf /etc/nginx/conf.d/