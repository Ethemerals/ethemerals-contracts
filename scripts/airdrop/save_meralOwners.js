const fs = require('fs');
const { getOwnerAddresses, chunk, occuranceCount } = require('../../utils/airdropUtils');

const dir = './scripts/airdrop/batches_to_process';
const BATCH_SIZE = 10;

const createBaseDirectory = () => {
    // remove everything from the directory if it exists
    fs.rmdirSync(dir, { recursive: true }, (err) => {
        if (err) {
            throw err;
        }
    });
    // create the directory if it does not exists
    if (!fs.existsSync(dir)) {
        console.log("creating directory")
        fs.mkdirSync(dir);
    }
}

const writeMeralBatch = (batch, batchNr) => {
    try {
        batchString = JSON.stringify(batch);
        fs.writeFileSync(dir + '/' + batchNr + ".txt", batchString)
    } catch (err) {
        console.error(err)
    }
}

async function main() {
    // meral owners from the graph
    const owners = await getOwnerAddresses();

    createBaseDirectory();

    for (let i = 0; i * BATCH_SIZE < owners.length; i++) {
        let batch = owners.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        writeMeralBatch(batch, i);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
