FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--host", "lan", "--port", "8081"]