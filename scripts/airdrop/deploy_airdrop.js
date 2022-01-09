const hre = require('hardhat');

async function main() {
    let admin;
    [admin] = await ethers.getSigners();
    let initialElfxAmount = 10000;

    const ELFX = await ethers.getContractFactory('ELFX');
    elfx = await ELFX.deploy('Excess Ethemeral Life Force ', 'ELFX', initialElfxAmount);
    await elfx.deployed();

    const Airdrop = await ethers.getContractFactory('Airdrop');
    airdrop = await Airdrop.deploy(elfx.address);
    await airdrop.deployed();

    console.log("ELFX contract deployed at: " + elfx.address);
    console.log("Airdrop contract deployed at: " + airdrop.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
