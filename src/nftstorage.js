// import { NFTStorage, Blob } from "nft.storage";
// import dotenv from 'dotenv';
// dotenv.config();
const { NFTStorage, Blob } = require("nft.storage");
const API_KEY = process.env.NFT_STORAGE;
require("dotenv").config();

async function tryToUploadData(data) {
  try {
    const client = new NFTStorage({ token: API_KEY });
    const blobCreated = new Blob([JSON.stringify(data)]);
    const cid = await client.storeBlob(blobCreated);
    return cid;
  } catch (err) {
    console.log(err);
  }
  return tryToUploadData(data);
}

module.exports = tryToUploadData;