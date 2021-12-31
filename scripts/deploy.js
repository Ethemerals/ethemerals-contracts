// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

// async function main() {
// 	const Ethemerals = await hre.ethers.getContractFactory('Ethemerals');
// 	const ethemerals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x5900f8d3d9Fc8425c6DC22b5bda71a1e0E594135'); // MAINNET ADDRESS

// 	await ethemerals.deployed();

// 	console.log('ethemerals deployed to:', ethemerals.address);
// }

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';

async function main() {
	const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
	wildsAdminActions = await WildsAdminActions.deploy();
	await wildsAdminActions.deployed();

	const WildsStaking = await ethers.getContractFactory('WildsStaking');
	wildsStaking = await WildsStaking.deploy();
	await wildsStaking.deployed();

	const WildsActions = await ethers.getContractFactory('WildsActions');
	wildsActions = await WildsActions.deploy();
	await wildsActions.deployed();

	const Wilds = await ethers.getContractFactory('Wilds');
	wilds = await Wilds.deploy(EthemeralsAddress_4, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
	await wilds.deployed();

	console.log('wilds deployed to:', wilds.address);
	console.log('wildsAdminActions deployed to:', wildsAdminActions.address);
	console.log('wildsStaking deployed to:', wildsStaking.address);
	console.log('wildsActions deployed to:', wildsActions.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
