var express = require('express');
const request = require('request');
const empty = require('is-empty');
const Validator = require('validatorjs');
const { Keyring, ApiPromise, WsProvider } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const {
  construct,
  createMetadata,
  getRegistry,
  methods,
  decode
} = require('@substrate/txwrapper-polkadot');

const config = require("../config/config.json");
var router = express.Router();

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
        url: 'http://localhost:3000/polkadot/transfer_request',
        json: postData
      }, async (error, req, resp) => {
        if(error) {
          return res.status(500).json({err: error.toString()});
        } else {
          if(!empty(resp.unsigned)) {
            await cryptoWaitReady();

            const {unsigned, metadataRpc, specVersion} = resp;
            const registry = getRegistry({
              chainName: 'Polkadot',
              specName: 'polkadot',
              specVersion,
              metadataRpc
            });

            const signingPayload = construct.signingPayload(unsigned, { registry });

            // const keyring = new Keyring({ type: 'ed25519' });
            const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
            const keypair = keyring.addFromUri(config.polka_key);

            registry.setMetadata(createMetadata(registry, metadataRpc));
            const {signature} = registry
              .createType('ExtrinsicPayload', signingPayload, {
                version: 4
              })
              .sign(keypair);
            
            const tx = construct.signedTx(unsigned, signature, {
              metadataRpc,
              registry
            });

            request.post({
              url: 'http://localhost:3000/polkadot/transfer_broadcast',
              json: {
                rawTransaction: tx,
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
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

router.post('/test', async (req, res) => {
  const postData = req.body;

  const provider = new WsProvider('ws://127.0.0.1:9944');
	const api = await ApiPromise.create({ provider: provider });
	const blockInfo = await api.rpc.chain.getBlock();
	const blockNumber = blockInfo.block.header.number;
	const blockHash = await api.rpc.chain.getBlockHash(blockNumber.unwrap());
	const genesisHash = api.genesisHash;
	const specVersionInfo = api.runtimeVersion;
	const specVersion = specVersionInfo.specVersion;
	const transactionVersion = specVersionInfo.transactionVersion;
	const metadataRpc = api.runtimeMetadata.toHex();
  const nonceVal = await api.rpc.system.accountNextIndex(postData.from);
  const nonce = nonceVal.words[0];

  // Using 42 for the --dev chain
	const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
	// const keypair = keyring.addFromUri('//Alice', { name: 'Alice' });
  const keypair = keyring.addFromUri(config.polka_key);

	const registry = getRegistry({
    chainName: 'Polkadot',
    specName: 'polkadot',
		specVersion: specVersion.toNumber(),
		metadataRpc
  });

	const txInfo = methods.balances.transfer(
		{
			dest: postData.receiver,
			value: postData.amount,
		},
		{
			address: keypair.address,
			// Making sure all the polkadot-js types are converted to JS primitives
			blockHash: blockHash.toHex(),
			blockNumber: blockNumber.unwrap().toNumber(),
			genesisHash: genesisHash.toHex(),
			metadataRpc: metadataRpc,
			nonce,
			specVersion: specVersion.toNumber(),
			tip: 0,
			eraPeriod: 64,
			transactionVersion: transactionVersion.toNumber(),
		},
		{
			registry: registry,
			metadataRpc: metadataRpc,
		}
	);


  const signingPayload = construct.signingPayload(txInfo, { registry });
  const { signature } = registry.createType(
		'ExtrinsicPayload',
		signingPayload,
		{
			version: 4,
		}
	)
  .sign(keypair);
  
  const signedTx = construct.signedTx(txInfo, signature, {
		metadataRpc,
		registry,
	});

	// You will see an error saying: "REGISTRY: Error: findMetaCall: ...", but that is
	// just a side effect of `decode` trying to determine the payload type so no need to worry
	// const decodedSignedTx = decode(signedTx, { metadataRpc, registry });
	
  console.log('signedTx: ' + signedTx);
  
  const txHash = await api.rpc.author.submitExtrinsic(signedTx);
  return res.json({txHash});
});

module.exports = router;
