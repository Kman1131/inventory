FROM node:20-bookworm-slim

WORKDIR /app

RUN echo 'Acquire::Check-Date "false";' > /etc/apt/apt.conf.d/10noCheckDate \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY types.ts ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/inventory.db

VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "dist/src/index.js"]