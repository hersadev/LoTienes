FROM node:22-slim

# Expo usa git para algunas comprobaciones; watchman no hace falta
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081
ENV CI=1
CMD ["npx", "expo", "start"]
