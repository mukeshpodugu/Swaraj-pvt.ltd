FROM node:20-alpine

# Install native dependencies required by Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend/ ./
COPY shared/ /shared/

RUN npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/app/src/index.js"]
