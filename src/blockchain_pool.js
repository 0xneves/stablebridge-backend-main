function start_blockchain_pool(mercadopago, db) {
    const ethers = require("ethers");
    const infuraKey = process.env.INFURA_KEY;
    const alchemyKey = process.env.ALCHEMY_KEY;
    const quiknodeKey = process.env.QUIK_NODE_KEY;
    const privateKey = process.env.PRIVATE_KEY;
    const pix_expiration_minutes = 5;

    abi = [
        "event BurnToBridge(uint256 value, address indexed to, uint256 network)",
        "event Withdraw(uint256 value, string pixKey)",
        "function setNetworks(uint256 network, bool accepted) public",
        "function mint(address to, uint256 amount) public",
        "function withdraw(uint256 value, string calldata pixKey) public",
        "function burnToBridge(uint256 value, address to, uint256 network) public",
    ]

    const tokens = {
        // ropsten: {
        //     address: "0x867d5aD572Eff4ec5E596FbC8B5E77E81f282D6c",
        //     provider_url: `https://ropsten.infura.io/v3/${infuraKey}`,
        //     abi,
        // },
        polygon: {
            address: "0x0DFcd028b5AD0E789AcB8d1C5bE1218FA59bC62A",
            provider_url: `wss://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
            abi,
            id: 137,
            gasPriceGwei: 50,
        },
        fantom: {
            address: "0x091F87f4629C0E8C5b4B892b40f9a8f5D9af1322",
            provider_url: `wss://proportionate-falling-pond.fantom.discover.quiknode.pro/${quiknodeKey}/`,
            abi,
            id: 250,
            gasPriceGwei: 50,
        },
        bsc: {
            address: "0x71659658aa5656d94598f688dfc39bed66b933b5",
            provider_url: `wss://aged-empty-pond.bsc.discover.quiknode.pro/05b82d97cd69407de033331941130b701ad2e708/`,
            abi,
            id: 56,
            gasPriceGwei: 5,
        }
    }

    async function mint(network, address, amount) {
        console.log("Minting", amount, "to", address, "on", network);
        const tx = await tokens[network].contract.mint(
            address,
            ethers.utils.parseUnits(amount.toString(), 6),
            {
                gasLimit: 3000000,
                gasPrice: ethers.utils.parseUnits(tokens[network].gasPriceGwei.toString(), "gwei"),
            }
        );
        await tx.wait();
        console.log("Minted", amount, "to", address, "on", network);
    }


    for (const [network, token] of Object.entries(tokens)) {
        token.provider = new ethers.providers.WebSocketProvider(
            token.provider_url
        );
        token.wallet = new ethers.Wallet(privateKey, token.provider);
        token.contract = new ethers.Contract(
            token.address,
            token.abi,
            token.wallet
        );

        console.log(`Listening to ${network}...`);
        token.contract.on("BurnToBridge", async (value, to, network) => {
            value = ethers.utils.formatUnits(value, 6);
            network = network.toString();

            const network_name = Object.keys(tokens).find(
                (key) => tokens[key].id == network
            );

            await mint(network_name, to, value);
        });
    }


    setInterval(async () => {
        // choose a random non verified and non expired pix key
        // and check if it is now verified

        const sql = `
        SELECT * FROM pix
        WHERE approved_at IS NULL
        AND created_at > ${new Date(
            new Date() - pix_expiration_minutes * 60 * 1000
        ).getTime()}
        ORDER BY RANDOM()
        LIMIT 1
    `;
        await db.each(sql, async (err, row) => {
            if (err) {
                console.log(err);
            } else {
                const { pix_id, amount, network, address } = row;
                console.log("Checking pix", pix_id);
                const verification = await mercadopago.payment.get(pix_id);
                const approved = verification.body.date_approved ? true : false;
                if (approved) {
                    await db.run(
                        `
                    UPDATE pix
                    SET approved_at = ?
                    WHERE pix_id = ?
                `,
                        [new Date().getTime(), pix_id]
                    );
                    console.log("Pix", pix_id, "approved");

                    await mint(network, address, amount);
                }
            }
        });
    }, 1000);
}

module.exports = start_blockchain_pool;
