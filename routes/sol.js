const express = require('express');
const empty = require('is-empty');
const request = require('request');
const Base58 = require('base-58');
const nacl = require('tweetnacl');
const {Token} = require("@solana/spl-token");
const solanaWeb3 = require('@solana/web3.js');
const Validator = require('validatorjs');

const config = require("../config/config.json");
const router = express.Router();

router.get('/', (req, res) => {
    const uint8Arr = new Uint8Array(Base58.decode(config.solana_key1));
    console.log(uint8Arr);
    return res.json({uint8Arr});
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
            errors: validator.errors.all(),
        });
    } else {
        try {
            request.post({
                url: 'http://localhost:3000/solana/transfer_request',
                json: postData
            }, async (error, req, resp) => {
                if(error) {
                    return res.status(500).json({err: error.toString()});
                } else {
                    if(!empty(resp.blockhash)) {
                        const uint8Arr = new Uint8Array(Base58.decode(config.solana_key));
                        const fromWallet = solanaWeb3.Keypair.fromSecretKey(uint8Arr);

                        const manualTransaction = new solanaWeb3.Transaction({
                            recentBlockhash: resp.blockhash,
                            feePayer: fromWallet.publicKey
                        });
                        manualTransaction.add(solanaWeb3.SystemProgram.transfer({
                            fromPubkey: new solanaWeb3.PublicKey(postData.from),
                            toPubkey: new solanaWeb3.PublicKey(postData.receiver),
                            lamports: solanaWeb3.LAMPORTS_PER_SOL * postData.amount,
                        }));
                        
                        const signature = nacl.sign.detached(new Uint8Array(manualTransaction.serializeMessage()), fromWallet.secretKey);
                        manualTransaction.addSignature(fromWallet.publicKey, new Buffer.from(signature));
                        
                        console.log(`The signatures were verifed: ${manualTransaction.verifySignatures()}`)

                        request.post({
                            url: 'http://localhost:3000/solana/transfer_broadcast',
                            json: {
                                rawTransaction: manualTransaction.serialize(),
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

router.post('/spl', (req, res) => {
    const postData = req.body;
    const validator = new Validator(postData, {
        from: 'required|string',
        receiver: 'required|string',
        amount: 'required',
        programId: 'required|string',
        mintAddress: 'required|string',
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
                url: 'http://localhost:3000/solana/transfer_request_spl',
                json: postData
            }, async (error, req, resp) => {
                if(error) {
                    return res.status(500).json({err: error.toString()});
                } else {
                    if(!empty(resp.blockhash) && !empty(resp.decimals)) {
                        const uint8Arr = new Uint8Array(Base58.decode(config.solana_key));
                        const fromWallet = solanaWeb3.Keypair.fromSecretKey(uint8Arr);

                        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("testnet"));
                        const myToken = new Token(
                            connection,
                            new solanaWeb3.PublicKey(postData.programId),
                            new solanaWeb3.PublicKey(postData.mintAddress),
                            fromWallet
                        );

                        const fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
                            new solanaWeb3.PublicKey(postData.from)
                        );

                        const toTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
                            new solanaWeb3.PublicKey(postData.receiver)
                        );

                        const manualTransaction = new solanaWeb3.Transaction({
                            recentBlockhash: resp.blockhash,
                            feePayer: fromWallet.publicKey
                        });
                        manualTransaction.add(
                            Token.createTransferInstruction(
                                new solanaWeb3.PublicKey(postData.mintAddress),
                                fromTokenAccount.address,
                                toTokenAccount.address,
                                fromWallet.publicKey,
                                [],
                                postData.amount * Math.pow(10, 9)
                            )
                        );
                        
                        const signature = nacl.sign.detached(new Uint8Array(manualTransaction.serializeMessage()), fromWallet.secretKey);
                        manualTransaction.addSignature(fromWallet.publicKey, new Buffer.from(signature));

                        request.post({
                            url: 'http://localhost:3000/solana/transfer_broadcast',
                            json: {
                                rawTransaction: manualTransaction.serialize(),
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

router.post('/nft', (req, res) => {
    const postData = req.body;
    const validator = new Validator(postData, {
        from: 'required|string',
        receiver: 'required|string',
        amount: 'required',
        programId: 'required|string',
        mintAddress: 'required|string',
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
                url: 'http://localhost:3000/solana/transfer_request',
                json: postData
            }, async (error, req, resp) => {
                if(error) {
                    return res.status(500).json({err: error.toString()});
                } else {
                    if(!empty(resp.blockhash)) {
                        const uint8Arr = new Uint8Array(Base58.decode(config.solana_key));
                        const fromWallet = solanaWeb3.Keypair.fromSecretKey(uint8Arr);

                        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"));
                        const myToken = new Token(
                            connection,
                            new solanaWeb3.PublicKey(postData.programId),
                            new solanaWeb3.PublicKey(postData.mintAddress),
                            fromWallet
                        );

                        const fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
                            new solanaWeb3.PublicKey(postData.from)
                        );

                        const toTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
                            new solanaWeb3.PublicKey(postData.receiver)
                        );

                        const manualTransaction = new solanaWeb3.Transaction({
                            recentBlockhash: resp.blockhash,
                            feePayer: fromWallet.publicKey
                        });
                        manualTransaction.add(
                            Token.createTransferInstruction(
                                new solanaWeb3.PublicKey(postData.mintAddress),
                                fromTokenAccount.address,
                                toTokenAccount.address,
                                fromWallet.publicKey,
                                [],
                                // 1000000,
                                1
                            )
                        );
                        
                        const signature = nacl.sign.detached(new Uint8Array(manualTransaction.serializeMessage()), fromWallet.secretKey);
                        manualTransaction.addSignature(fromWallet.publicKey, new Buffer.from(signature));

                        request.post({
                            url: 'http://localhost:3000/solana/transfer_broadcast',
                            json: {
                                rawTransaction: manualTransaction.serialize(),
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
