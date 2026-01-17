# syntax=docker/dockerfile:1

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG PUBLIC_X07_INDEX_BASE
ARG PUBLIC_X07_CATALOG_PATH
ENV PUBLIC_X07_INDEX_BASE=${PUBLIC_X07_INDEX_BASE}
ENV PUBLIC_X07_CATALOG_PATH=${PUBLIC_X07_CATALOG_PATH}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/ /usr/share/nginx/html/

EXPOSE 8080

