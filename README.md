# OpenWeather Map fetch script
This script fetches the weather data of the past three days and saves it to an influxdb.

## How to use
You need a `.env` file with the following variables:
```
OPENWEATHER_API_KEY=YOUR_API_KEY
INFLUXDB_ORG=YOUR_INFLUXDB_ORG
INFLUXDB_BUCKET=YOUR_INFLUXDB_BUCKET
INFLUXDB_TOKEN=YOUR_INFLUXDB_TOKEN

PORT=3000
```

After creating the `.env` file you need to create a settings.json file with the following content:
```
{
  "name": "LOCATION_NAME",
  "latitude": "LOCATION_LATITUDE",
  "longitude": "LOCATION_LONGITUDE",
  "language": "OPENWEATHER_LANGUAGE",
  "units": "OPENWEATHER_UNITS"
}
```

After that you must install the dependencies:
```
npm install
```
or
```
yarn
```

You can then run the script with `npm start` or `yarn start`


# ToDo
- [ ] Add a route to request the saved data
- [ ] Add a route to request the rain sum of the past three days
- [ ] Dockerize the script