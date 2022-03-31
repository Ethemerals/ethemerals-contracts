const hre = require('hardhat');
const { getAddresses } = require('../adminCalls/addresses');

let chain = 4;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	await hre.run('verify:verify', {
		address: getAddresses(chain).priceFeedProvider,
		constructorArguments: [],
	});

	await sleep(4000);

	await hre.run('verify:verify', {
		address: getAddresses(chain).eternalBattle,
		constructorArguments: [getAddresses(chain).meralManager, getAddresses(chain).priceFeedProvider],
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
