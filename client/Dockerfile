FROM node:20-alpine

WORKDIR /app

# react-scripts 5 usa una API de OpenSSL retirada en Node 17+; sin esto no arranca.
ENV NODE_OPTIONS=--openssl-legacy-provider

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
