# Use official Node.js runtime as a parent image
FROM node:22-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Ensure Rhubarb binary is executable
RUN chmod +x ./bin/rhubarb/rhubarb

# Install ffmpeg and other system dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Make rhubarb available in PATH
ENV PATH="/app/bin/rhubarb:$PATH"

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "start"]
