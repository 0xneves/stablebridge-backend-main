// old_cid -> 
// const mapping

function create_router(mercadopago, db) {
    const express = require("express");
    const router = express.Router();
    const tryToUploadData = require("./nftstorage");

    router.get("/", (req, res) => {
        return res.send("Hello World!");
    });

    router.post("/create-pix-table", async (req, res) => {
        // id: autoincrement
        // pix_id: int
        // amount: float
        // created_at: datetime
        // approved_at: datetime
        // qr_code: string
        // ticket_url: string
        // address: string
        // network: string
        // ipfs_cid: string

        await db.run(`
        CREATE TABLE IF NOT EXISTS pix (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pix_id INTEGER,
            amount REAL,
            created_at INTEGER,
            approved_at INTEGER,
            qr_code TEXT,
            ticket_url TEXT,
            address TEXT,
            network TEXT,
            ipfs_cid TEXT
        )
        `);

        return res.send("Pix table created");
    });

    const network_id_mapping = {
        "0x1": "mainnet",
        "0x3": "ropsten",
        "0x4": "rinkeby",
        "0x5": "goerli",
        "0x2a": "kovan",
        "0x13881": "matic",
        "0x13880": "mumbai",
        "0x61": "bsc",
    };

    router.post("/create-pix", async (req, res) => {
        let { amount, address, network, network_id } = req.body;

        if (!amount) console.log("Amount not provided");
        if (!address) console.log("Address not provided");
        if (!network && !network_id) console.log("Network not provided");

        if (!network) {
            network = network_id_mapping[network_id];
        }

        const payment_data = {
            transaction_amount: amount,
            payment_method_id: "pix",
            payer: {
                email: "email@email.com",
                first_name: "Name",
                last_name: "Last Name",
            },
        };

        const payment = await mercadopago.payment.create(payment_data);

        const pix_id = payment.body.id;
        const qr_code =
            payment.response.point_of_interaction.transaction_data.qr_code;
        const qr_code_base64 =
            payment.response.point_of_interaction.transaction_data.qr_code_base64;
        const ticket_url =
            payment.response.point_of_interaction.transaction_data.ticket_url;


        const QR_cid = await tryToUploadData(qr_code_base64);

        const ipfs = {
            pix_id: pix_id,
            qr_code_base64: QR_cid,
            amount: amount,
            address: address,
            network: network,
            network_id: network_id
        }

        const ipfs_cid = await tryToUploadData(ipfs);

        await db.run(
            `
          INSERT INTO pix (pix_id, amount, created_at, qr_code, ticket_url, address, network, ipfs_cid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [pix_id, amount, new Date(), qr_code, ticket_url, address, network, ipfs_cid]
        );

        return res.json({
            id: pix_id,
            qr_code,
            qr_code_base64,
            ticket_url,
            ipfs_cid
        });
    });

    router.post("/verify-pix", async (req, res) => {
        const { id } = req.body;
        const getData = (id) => {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.get(`select * from pix where pix_id = ?`, [id], (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    });
                });
            });
        };

        let result = await getData(id);

        const newRow = [result.ipfs_cid, result.date_approved, new Date()]
        const newCid = await tryToUploadData(newRow);

        db.run(
            `
            UPDATE pix SET ipfs_cid = ? WHERE pix_id = ?
            `,
            [newCid, id]
        )

        const verification = await mercadopago.payment.get(id);
        const approved = verification.body.date_approved ? true : false;
        return res.json({
            id,
            approved,
            newCid
        });
    });

    return router;
}

module.exports = create_router;
