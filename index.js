const express = require('express')

const port = process.env.PORT || 5000;

const app = express();

app.get("/", (req, res) => {
    res.json("Hello You are on Technoforum server");
})
 
app.listen(5000, (port) => {
    console.log("Server is listening on port: ", 5000);
})