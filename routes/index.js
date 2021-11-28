const express = require('express');
const Web3 = require('web3');
const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/570f1ebd62024227a90b259a6e718de0"));

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
