const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const URL = process.env.INFLUXDB_URL
const TOKEN = process.env.INFLUXDB_TOKEN
const ORG = process.env.INFLUXDB_ORG
const BUCKET = process.env.INFLUXDB_BUCKET

const client = new InfluxDB({url: URL, token: TOKEN})

module.exports.writeDataToInfluxDB = (data) => {
  const locationPoints = data.map((location) => {
    const units = location.units

    const promises = location.hourly.map((entry) => {
      const writeApi = client.getWriteApi(ORG, BUCKET)
      writeApi
        .useDefaultTags({ location: location.name })
      const dt = new Date((entry.dt*1000))
      

      const tempPoint = new Point('temperature')
      tempPoint
        .floatField('value', entry.temperature)
        .floatField(
          units == 'metric' ? 'celsius' : units == 'imperial' ? 'fahrenheit' : 'kelvin',
          entry.temperature
        )
      
      const feelsLikePoint = new Point('feelsLike')
      feelsLikePoint
        .floatField('value', entry.feels_like)
        .floatField(units == 'metric' ? 'celsius' : units == 'imperial' ? 'fahrenheit' : 'kelvin', entry.feels_like)
      
      const pressurePoint = new Point('pressure')
      pressurePoint
        .floatField('hPa', entry.pressure)
      
      const humidityPoint = new Point('humidity')
      humidityPoint
        .intField('percent', entry.humidity)
      
      const dewPointPoint = new Point('dew_point')
      dewPointPoint
        .floatField('value', entry.dew_point)
        .floatField(units == 'metric' ? 'celsius' : units == 'imperial' ? 'fahrenheit' : 'kelvin', entry.dew_point)
      
      const uviPoint = new Point('uv_index')
      uviPoint
        .floatField('index', entry.uvi)
      
      const cloudsPoint = new Point('clouds')
      cloudsPoint
        .intField('percent', entry.clouds)
      
      const visibility = new Point('visibility')
      visibility
        .intField('metres', entry.visibility)
      
      const windPoint = new Point('wind')
      windPoint
        .floatField('speed', entry.wind_speed)
        .floatField('degree', entry.wind_deg)
        .stringField('speed_unit', units == 'metric' ? 'metres_per_second' : units == 'imperial' ? 'miles_per_hour' : 'metres_per_second')
        .stringField('gust_unit', units == 'metric' ? 'metres_per_second' : units == 'imperial' ? 'miles_per_hour' : 'metres_per_second')
      
      const weatherPoint = new Point('weather')
      weatherPoint
        .stringField('main', entry.weather)
        .stringField('description', entry.weather_desc)
      
      const rainPoint = new Point('rain')
      rainPoint
        .intField('mm', entry.rain_1h)
      
      let points = [
        tempPoint,
        feelsLikePoint,
        pressurePoint,
        humidityPoint,
        dewPointPoint,
        uviPoint,
        cloudsPoint,
        visibility,
        windPoint,
        weatherPoint,
        rainPoint
      ]

      // set the time and location name for every point
      points.forEach((point) => {
        point.timestamp(dt)
      })
      
      writeApi.writePoints(points)
      return writeApi.close()
    })

    return promises
  })
  
  Promise.all(locationPoints).then(() => {
    console.log("Done")
  })
  .catch((err) => {
    console.log(err)
  })
}