const express = require('express');
const empty = require('is-empty');
const request = require('request');
const bitcore = require('bitcore-lib');

const config = require("../config/config.json");
const router = express.Router();

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
            errors: validator.errors.all(),
        });
    } else {
        try {
            request.post({
                url: 'http://localhost:3000/bitcoin/transfer_request',
                json: postData
            }, async (error, req, resp) => {
                if(error) {
                    console.log(error);
                    return res.status(500).json({err: error.toString()});
                } else {
                    if(!empty(resp.rawTranaction)) {
                        const utxo = await insight.getUtxos(resp.from);
                        const tx = bitcore.Transaction();
                        tx.from(utxo);
                        tx.to(resp.receiver, resp.amount);
                        tx.change(resp.from);
                        tx.fee(resp.fee);
                        tx.sign(config.bit_key);
                        tx.serialize();

                        request.post({
                            url: 'http://localhost:3000/bitcoin/transfer_broadcast',
                            json: {
                                rawTransaction: tx.toString(),
                                network: postData.network
                            }
                        }, (err, req1, resp1) => { 
                            if(err) {
                                console.log(err);
                                return res.status(500).json({err: err.toString()});
                            } else {
                                return res.json(resp1);
                            }
                        });
                    } else {
                        return res.status(500).json({error: "Invalid unsigned transaction"});
                    }
                }
            }, (err) => {
                return res.status(500).json({ error: error.toString() });
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
