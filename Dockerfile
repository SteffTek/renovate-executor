# Create Build Image
FROM node:22.9.0-alpine3.20 as build

WORKDIR /app

# Build Step
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Create Production Image
FROM node:22.9.0-alpine3.20

WORKDIR /app

# Install Step
COPY --from=build /app/package.json ./
RUN npm install --only=production
COPY --from=build /app/dist ./dist

# Configuration
EXPOSE 4000
CMD ["node", "dist/index.js"]