const express = require('express');
// const Tx = require('ethereumjs-tx').Transaction;
const Tx = require('ethereumjs-tx');
const request = require('request');
const empty = require('is-empty');
const Validator = require('validatorjs');

const config = require("../config/config.json");
const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.json({"message": "server is running"});
});

router.post('/', (req, res) => {
  const postData = req.body;
  const validator = new Validator(postData, {
    from: 'required|string',
    receiver: 'required|string',
    amount: 'required',
    network: 'required|string'
  });
  
  if(validator.fails()) {
    return res.status(401).json({
      type: 'ValidationError',
      errors: validation.errors.all(),
    });
  } else {
    try {
      request.post({
        // url: 'http://localhost:3000/ethers/transfer_request',
        url: 'http://54.251.180.59/ethers/transfer_request',
        json: postData
      }, (error, req, resp) => {
        if(error) {
          return res.status(500).json({err: error.toString()});
        } else {
          if(!empty(resp.rawTransaction)) {
            const tx = new Tx(resp.rawTransaction);
            const privKey = Buffer.from(config.private_key, 'hex');
            tx.sign(privKey);
            
            const serializedTx = `0x${tx.serialize().toString('hex')}`;

            request.post({
              // url: 'http://localhost:3000/ethers/transfer_broadcast',
              url: 'http://54.251.180.59/ethers/transfer_broadcast',
              json: {
                rawTransaction: serializedTx,
                network: postData.network
              }
            }, (err, req1, resp1) => { 
              if(err) {
                return res.status(500).json({err: err.toString()});
              } else {
                return res.json(resp1);
              }
            });
          } else {
            return res.status(500).json({err: 'invalid raw transaction'});
          }
        }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
