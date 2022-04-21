const hre = require('hardhat');
const { getAddresses, currentChain } = require('../adminCalls/addresses');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// await hre.run('verify:verify', {
	// 	address: getAddresses(chain).priceFeedProvider,
	// 	constructorArguments: [],
	// });

	// await sleep(4000);
	await hre.run('verify:verify', {
		address: getAddresses(currentChain).priceFeedProvider,
		constructorArguments: [],
	});

	await hre.run('verify:verify', {
		address: getAddresses(currentChain).eternalBattle,
		constructorArguments: [getAddresses(currentChain).meralManager, getAddresses(currentChain).priceFeedProvider],
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
