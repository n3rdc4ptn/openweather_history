
const dotenv = require("dotenv");
dotenv.config();
const { getrainforecast } = require("./index");

const express = require("express");

const app = express();

app.get("/rain", getrainforecast);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
