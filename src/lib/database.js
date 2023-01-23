const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const client = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
})

function getDataFromDatabase(measurement, unit, location, range) {
  const readApi = client.getQueryApi(process.env.INFLUXDB_ORG)

  const query = `
    from(bucket: "${process.env.INFLUXDB_BUCKET}")
    |> range(start: -${range}, stop: now())
    |> filter(fn: (r) => r._measurement == "${measurement}")
    |> filter(fn: (r) => r._field == "${unit}")
    |> filter(fn: (r) => r.location == "${location}")
    `;

  return new Promise((resolve, reject) => {
    const result = [];
    readApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row)
        result.push({
          dt: o._time,
          field: o._field,
          value: o._value,
        })
      },
      error(error) {
        reject(error)
      },
      complete() {
        resolve(result)
      }
    })
  })
}

async function writeDataToDatabase(data) {
  const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET)

  data.forEach((location) => {
    const units = location.units

    location.hourly.forEach((entry) => {
      const dt = new Date((entry.dt * 1000))

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

      const weatherPoint = new Point('weather')
      weatherPoint
        .stringField('main', entry.weather)
        .stringField('description', entry.weather_desc)

      const rainPoint = new Point('rain_float')
      rainPoint
        .floatField('mm', entry.rain_1h)

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
        point.tag('location', location.name)
      })

      writeApi.writePoints(points)
    })
  })

  await writeApi.close()
}

module.exports = {
  getDataFromDatabase,
  writeDataToDatabase
}
