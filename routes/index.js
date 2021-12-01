const express = require('express');
const Web3 = require('web3');
const request = require('request');
const router = express.Router();

const config = require("../config/config.json");

const web3 = new Web3(new Web3.providers.HttpProvider(config.network));

/* GET home page. */
router.get('/', (req, res) => {
  res.json({"message": "server is running"});
});

router.post('/', async (req, res) => {
  const postData = req.body;
  const selBlock = await web3.eth.getBlock(postData.blockNumber);
  res.json({'hash': selBlock.hash});
});

module.exports = router;
