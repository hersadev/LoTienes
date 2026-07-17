FROM node:22-slim

WORKDIR /app

# Solo las dependencias primero, para aprovechar la caché de Docker
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src

EXPOSE 3001
CMD ["node", "src/server.js"]
