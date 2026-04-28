# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Satisfy Prisma 7 validation during build
ENV DATABASE_URL="mysql://root:root@localhost:3306/dummy"
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install ts-node and typescript globally for seeding in runtime
RUN npm install -g ts-node typescript

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/config.json ./
COPY --from=build /app/wallet ./wallet

# Ensure the app waits for DB and seeds
EXPOSE 3000

# Fix: path to dist/src/main if nest build outputs it there
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/src/main"]
