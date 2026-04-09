# Use node v22 as base image
FROM node:22-alpine

# Goes to app dir 
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci


# Copy the rest of app into container
# Make sure to setup .dockerignore
COPY . .

RUN npm run build
# Run the app
CMD ["npm", "start"]
