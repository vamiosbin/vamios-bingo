FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run --workspace packages/shared build && npm run --workspace apps/api build
EXPOSE 3001
CMD ["npm","run","start:api"]
