const hre = require('hardhat');
const { getIdFromType } = require('../../test/utils');
const { getAddresses } = require('./addresses');

let chain = 4;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const merals = await MeralManager.attach(getAddresses(chain).meralManager);

	const PriceFeedProvider = await ethers.getContractFactory('PriceFeedProvider');
	const priceFeed = await PriceFeedProvider.attach(getAddresses(chain).priceFeedProvider);
	value = await priceFeed.getLatestPrice(1);
	console.log(value);

	// value = await merals.getTypeByContract(getAddresses(chain).merals);
	// console.log(value);
	// await sleep(4000);

	// let tokenId = 510;
	// await merals.registerMeral(getAddresses(chain).merals, tokenId, 5426, 2000, 300, 609, 199, 731, 16, 8);
	// await sleep(4000);
	// value = await merals.getMeralById(getIdFromType(1, tokenId));

	// console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
