const hre = require('hardhat');
const { getAddresses, currentChain } = require('../adminCalls/addresses');

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	await hre.run('verify:verify', {
		address: getAddresses(currentChain).meralManager,
		constructorArguments: [],
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
