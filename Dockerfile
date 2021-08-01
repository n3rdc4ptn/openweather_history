FROM node:14-alpine

WORKDIR /app
COPY . .

ENV PORT=3000
ENV OPENWEATHER_API_KEY=<your_api_key>
ENV INFLUXDB_URL=<your_influxdb_url>
ENV INFLUXDB_ORG=<your_influxdb_org>
ENV INFLUXDB_BUCKET=<your_influxdb_bucket>
ENV INFLUXDB_TOKEN=<your_influxdb_token>


RUN yarn

CMD [ "yarn", "start" ]