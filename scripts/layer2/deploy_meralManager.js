const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const deployedAddress = '0xC9e774d46FDa53A30952aAf1cD898C6B28Af2B56';
// meralManager deployed to: 0xb9853293C18605d7319C77e41E43DBb5959440A6

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// const MeralManager = await ethers.getContractFactory('MeralManager');
	// meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // TODO random register
	// await meralManager.deployed();
	// console.log('meralManager deployed to:', meralManager.address);

	await hre.run('verify:verify', {
		address: deployedAddress,
		constructorArguments: ['0x169310e61e71ef5834ce5466c7155d8a90d15f1e'],
	});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
