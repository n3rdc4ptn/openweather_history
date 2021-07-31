const express = require('express');
// Load dotenv config
require('dotenv').config();



const fetchData = require('./fetchData');
const {writeDataToInfluxDB, readDataFromFluxDB} = require('./database');

const locations = require('../locations.json');
const location_names = locations.map(location => location.name);


const app = express();

app.get("/fetch", async (req, res) => {
  const data = await fetchData()
  
  writeDataToInfluxDB(data);

  const amount_locations = data.length
  const amount_hourly = data.reduce((prev, curr) => prev + curr.hourly.length, 0)

  const output = `Fetched ${amount_locations} ${amount_locations < 2 ? 'location' : 'locations'} and ${amount_hourly} ${amount_hourly < 2 ? 'hour' : 'hours'}`
  console.info(output)
  res.send(output);
})

app.get("/rain", async (req, res) => {
  // get request param
  const location = req.query.location;
  if (location_names.indexOf(location) === -1) {
    res.send(`${location} is not a valid location`);
    return;
  }

  const range = req.query.range ?? '3d';

  const type = req.query.type ?? 'sum';



  const data = await readDataFromFluxDB(location, range, 'rain', 'mm');

  switch (type) {
    case 'sum':
      const rain_sum = data.reduce( (prev, curr) => prev + curr.value, 0);
      res.json({
        type,
        value: rain_sum,
        unit: 'mm'
      })
      break;
    case 'avg':
      break;
    default:
      res.send(`Invalid type: ${type}`);
  }
})

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
})