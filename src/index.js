const functions = require('@google-cloud/functions-framework');
const { getDataFromDatabase, writeDataToDatabase } = require('./lib/database');
const { fetchData } = require('./lib/fetchData');

const MEASUREMENT = 'rain_float';
const UNIT = 'mm';


const getrainforecast = async (req, res) => {

  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  const location = req.query.location;
  const range = req.query.range || '3d';

  const type = req.query.type || 'sum';


  const data = await getDataFromDatabase(MEASUREMENT, UNIT, location, range);

  switch (type) {
    case 'sum':
      const sum = data.reduce((acc, cur) => acc + cur.value, 0);
      res.json({
        type,
        value: sum,
        unit: 'mm'
      })
      break;
    case 'avg':
      const avg = data.reduce((acc, cur) => acc + cur.value, 0) / data.length;
      res.json({
        type,
        value: avg,
        unit: 'mm'
      })
    case 'max':
      const max = data.reduce((acc, cur) => acc > cur.value ? acc : cur.value, 0);
      res.json({
        type,
        value: max,
        unit: 'mm'
      })
      break;
    case 'min':
      const min = data.reduce((acc, cur) => acc < cur.value ? acc : cur.value, 0);
      res.json({
        type,
        value: min,
        unit: 'mm'
      })
      break;
    default:
      res.send(`Unknown type: ${type}`)
  }
};

module.exports = {
  getrainforecast
}

// HTTP Cloud Function.
functions.http('get-rain-forecast', getrainforecast);

functions.http("fetch-data", async (req, res) => {

  const data = await fetchData()

  await writeDataToDatabase(data)

  const amount_locations = data.length
  const amount_hourly = data.reduce((prev, curr) => prev + curr.hourly.length, 0)

  const output = `Fetched ${amount_locations} ${amount_locations < 2 ? 'location' : 'locations'} and ${amount_hourly} ${amount_hourly < 2 ? 'hour' : 'hours'}`
  console.info(output)
  res.send(output)
})
