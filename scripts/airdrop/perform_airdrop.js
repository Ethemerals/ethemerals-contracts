require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');
const { occuranceCount } = require('../../utils/airdropUtils');
const BATCHES_TO_PROCESS = './scripts/airdrop/batches_to_process/';
const PROCESSED_BATCHES = './scripts/airdrop/processed_batches/';
const PROVIDER_URL = `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMYID}`;
const ELFX_ADDRESS = "0x5A5eC8AEFdbd1f3587bA37ce53B038C605F1D419";
const AIRDROP_ADDRESS = "0x616Ff5653b1329d76f7E0A4e3e6BaEA49Fc670A1"
// how many elfx token is distributed for one meral owner - one address can have multiple merals so that address will get the multiple of this
const distributionPerMeral = 1;

async function main() {
    // setting up the admin account
    provider = ethers.getDefaultProvider(PROVIDER_URL);
    const admin = new ethers.Wallet(`0x${process.env.PRIV_KEY}`, provider);

    // contracts
    elfx = await ethers.getContractAt("ELFX", ELFX_ADDRESS);
    airdrop = await ethers.getContractAt("Airdrop", AIRDROP_ADDRESS);

    // remove everything from the target directory
    fs.rmdirSync(PROCESSED_BATCHES, { recursive: true }, (err) => {
        if (err) {
            throw err;
        }
    });
    // create the target directory 
    if (!fs.existsSync(PROCESSED_BATCHES)) {
        console.log("creating directory")
        fs.mkdirSync(PROCESSED_BATCHES);
    }

    // we need to collect all owners for approval and verification
    let owners = [];
    const filenames = fs.readdirSync(BATCHES_TO_PROCESS);
    for (let filename of filenames) {
        const data = fs.readFileSync(BATCHES_TO_PROCESS + filename, { encoding: 'utf8', flag: 'r' });
        let batch = JSON.parse(data);
        owners.push(...batch);
    }

    const totalDistribution = owners.length * distributionPerMeral;
    // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
    await elfx.connect(admin).approve(airdrop.address, totalDistribution);

    for (let filename of filenames) {
        const data = fs.readFileSync(BATCHES_TO_PROCESS + filename, { encoding: 'utf8', flag: 'r' });
        let batch = JSON.parse(data);
        await airdrop.connect(admin).distribute(batch, distributionPerMeral);
        // move the file into the processed directory
        fs.rename(BATCHES_TO_PROCESS + filename, PROCESSED_BATCHES + filename, function (err) {
            if (err) throw err
        })
        console.log(filename + " processed");
    }

    // Verification    
    // we need to count the occurancies of unique owners
    const occurances = occuranceCount(owners);
    const uniquAddresses = Object.keys(occurances);
    // for each unique owner
    for (let address of uniquAddresses) {
        // how many times the address occured in owners: how many merals it owns
        let occurance = occurances[address];
        // and its balance of elfx
        let balance = await elfx.balanceOf(address);
        console.log(address + " owns " + occurance + " merals, hence it got " + occurance + " * " + distributionPerMeral + " = " + balance + " elfx");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });