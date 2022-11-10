const express = require("express");
const app = express();
const mercadopago = require("mercadopago");
const sqlite3 = require("sqlite3");
const cors = require("cors");
require("dotenv").config();

const create_router = require("./router");
const start_blockchain_pool = require("./blockchain_pool");

const port = process.env.PORT || 4000;

const { MERCADO_PAGO_ACCESS_TOKEN } = process.env;
mercadopago.configurations.setAccessToken(MERCADO_PAGO_ACCESS_TOKEN);

const db = new sqlite3.Database("database.db", (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to database");
    }
});

app.use(express.json());
app.use(cors());

app.use(create_router(mercadopago, db));

start_blockchain_pool(mercadopago, db);

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
