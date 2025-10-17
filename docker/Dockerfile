FROM node:20-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chromium path for Playwright
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY backend/ ./backend/

# Generate Prisma client
RUN npx prisma generate --schema=./backend/src/db/schema.prisma || echo "Prisma generation skipped"

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
