FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/bot/package.json apps/bot/package.json
RUN npm install
COPY apps/bot apps/bot
RUN npm run --workspace apps/bot build
CMD ["npm","run","start:bot"]
