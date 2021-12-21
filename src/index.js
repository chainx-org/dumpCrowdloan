// USAGE:
//  node src/index.js
const ENDPOINT= "wss://kusama-rpc.polkadot.io";
const PARAID = 2013;
const DUMP="./sherpax-contributors.json"


const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aConcat, u8aToHex } = require('@polkadot/util');
const { blake2AsU8a, encodeAddress } = require('@polkadot/util-crypto');
const BN = require('bn.js');
const fs = require('fs');

function createChildKey(trieIndex) {
    return u8aToHex(
        u8aConcat(
            ':child_storage:default:',
            blake2AsU8a(
                u8aConcat('crowdloan', trieIndex.toU8a())
            )
        )
    );
}

// 9676800
// 0x9126dd5023eb9f711ca019aa6f2a247ebf911cae619396ff29471d84f402a760
// 10281600
// 0x566a5f52e343078ca4e1fd7ff39bd0930cd8311984d592b1709779215d5788bb
// 10615383(todo:10886400)
// 0x8d787dc440d65a82ed402b3686e2f97d3a6721cff34420856934ad1293820f6b

async function main () {
    const wsProvider = new WsProvider(process.env.ENDPOINT || ENDPOINT);
    const api = await ApiPromise.create({ provider: wsProvider });
    const paraId = parseInt(process.env.PARAID || PARAID);
    const dumpJson = process.env.DUMP || DUMP;
    const blockHash = "0x8d787dc440d65a82ed402b3686e2f97d3a6721cff34420856934ad1293820f6b"

    const fund = await api.query.crowdloan.funds.at(blockHash, paraId);
    const trieIndex = fund.unwrap().trieIndex;
    const childKey = createChildKey(trieIndex);

    const keys = await api.rpc.childstate.getKeys(childKey, '0x', blockHash);
    const ss58Keys = keys.map(k => encodeAddress(k, 2));
    console.log(ss58Keys);

    const values = await Promise.all(keys.map(k => api.rpc.childstate.getStorage(childKey, k, blockHash)));
    const contributions = values.map((v, idx) => ({
        from: ss58Keys[idx],
        data: api.createType('(Balance, Vec<u8>)', v.unwrap()).toJSON(),
    }));

    console.log(contributions);

    if (dumpJson) {
        const jsonStr = JSON.stringify(contributions, undefined, 2);
        fs.writeFileSync(dumpJson, jsonStr, {encoding: 'utf-8'});
    }
}

main().catch(console.error).finally(() => process.exit());
