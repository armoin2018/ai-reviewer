FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm i --ignore-scripts
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node","dist/server.js"]
