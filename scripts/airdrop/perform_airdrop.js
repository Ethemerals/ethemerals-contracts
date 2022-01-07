require('dotenv').config();
const { ethers } = require('hardhat');
const { getOwnerAddresses, chunk, occuranceCount } = require('../../utils/airdropUtils');
const PROVIDER_URL = `https://polygon-mumbai.g.alchemy.com/v2/${process.env.PROJECTID}`;
const ELFX_ADDRESS = "0xFC3719eDc116C89Ee2Eb26f13B5983dDB2d700f6";
const AIRDROP_ADDRESS = "0x496c5FF9fdA755084a72BE062E4d99848a2a9179"

async function main() {
    // setting up the admin account
    provider = ethers.getDefaultProvider(PROVIDER_URL);
    const admin = new ethers.Wallet(`0x${process.env.PRIV_KEY}`, provider);

    // contracts
    elfx = await ethers.getContractAt("ELFX", ELFX_ADDRESS);
    airdrop = await ethers.getContractAt("Airdrop", AIRDROP_ADDRESS);

    // meral owners from the graph
    const owners = await getOwnerAddresses();
    // this is the biggest batch size that goes through without gas limit reached error
    const batchSize = 10;
    // create batches of owner address of batchSize
    const batches = chunk(owners, batchSize);
    // how many elfx token is distributed for one meral owner - one address can have multiple merals so that address will get the multiple of this
    const distributionPerMeral = 1;
    const totalDistribution = owners.length * distributionPerMeral;

    // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
    await elfx.connect(admin).approve(airdrop.address, totalDistribution);

    for (let i = 0; i < batches.length; i++) {
        console.log("Processing the " + i + ". batch");
        await airdrop.connect(admin).distribute(batches[i], distributionPerMeral);
    }

    console.log("Distribution finished!")

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