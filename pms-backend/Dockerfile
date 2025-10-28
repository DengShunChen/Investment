FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install yahoo-finance2

COPY . .

RUN npm run build

CMD ["npm", "start"]
