const express = require('express');
// Load dotenv config
require('dotenv').config();



const fetchData = require('./fetchData');
const {writeDataToInfluxDB} = require('./database');


const app = express();

app.get("/fetch", async (req, res) => {
  const data = await fetchData()
  
  writeDataToInfluxDB(data);

  const amount_locations = data.length
  const amount_hourly = data.reduce((prev, curr) => prev + curr.hourly.length, 0)

  res.send(`Fetched ${amount_locations} ${amount_locations < 2 ? 'location' : 'locations'} and ${amount_hourly} ${amount_hourly < 2 ? 'hour' : 'hours'}`);
})

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
})