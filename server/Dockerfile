FROM node:latest
WORKDIR /app
COPY package.json /usr/src/app
RUN npm install
COPY . /app
CMD ["npm", "start"]