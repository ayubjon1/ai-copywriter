FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Set timezone (for correct scheduling)
ENV TZ=Europe/Moscow

# Start the bot
CMD ["npm", "start"]
