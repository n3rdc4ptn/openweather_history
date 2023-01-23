FROM node:alpine

# Create app directory
WORKDIR /app

COPY ./src/package.json .
COPY ./src/yarn.lock .

RUN yarn install

# Copy app source
COPY ./src .
RUN rm -rf .env

EXPOSE 3000

CMD [ "yarn", "start-standalone-get-rain" ]
