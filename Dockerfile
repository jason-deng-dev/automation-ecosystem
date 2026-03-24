# Use node v22 as base image
FROM node:22

# Goes to app dir 
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of app into container
# Make sure to setup .dockerignore
COPY . .

# Run the app
CMD ["npm", "start"]
