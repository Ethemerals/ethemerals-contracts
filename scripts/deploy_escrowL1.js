const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../test/utils');
let allMeralStats = MeralsL1Data();

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	escrowL1 = await EscrowL1.deploy(EthemeralsAddress_4);
	await escrowL1.deployed();
	console.log('escrowL1 deployed to:', escrowL1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
