#Builder Stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .

#Development Stage
FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev"]

#Production Dependencies Stage
FROM node:20-alpine AS production-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

#Production Stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=base /app/package*.json ./
COPY --from=base /app/src ./src
COPY --from=production-dependencies /app/node_modules ./node_modules
RUN addgroup -S nodejs && \
    adduser -S nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
CMD ["npm", "start"]


