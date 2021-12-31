const hre = require('hardhat');

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';

async function main() {
	const Onsen = await ethers.getContractFactory('Onsen');
	onsen = await Onsen.deploy(EthemeralsAddress_4);
	await onsen.deployed();

	console.log('onsen deployed to:', onsen.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
