const express = require('express');
const web3 = require('web3');
const router = express.Router();

/* GET home page. */
router.post('/', (req, res) => {
  const postData = req.body;
  console.log(web3.eth.getBlock(postData.blockNumber).hash);
  res.json({'message': "Server is running"});
});

module.exports = router;
