const hre = require('hardhat');
const { getAddresses, currentChain } = require('./adminCalls/addresses');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// L2 Contracts
	console.log(admin.address);

	const PriceFeedProvider = await ethers.getContractFactory('PriceFeedProvider');
	priceFeedProvider = await PriceFeedProvider.deploy();
	await priceFeedProvider.deployed();

	console.log('PriceFeedProvider deployed to:', priceFeedProvider.address);
	await sleep(10000);

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	battle = await EternalBattle.deploy(getAddresses(currentChain).meralManager, priceFeedProvider.address);
	await battle.deployed();

	console.log('Battle deployed to:', battle.address);
	await sleep(10000);

	await battle.resetGamePair(1, true);
	await sleep(10000);
	await battle.resetGamePair(2, true);
	await sleep(10000);
	console.log('reset game pair');

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(currentChain).meralManager);

	await meralManager.addGM(battle.address, true);
	await sleep(10000);
	console.log('added battle GM');

	await priceFeedProvider.upsertFeed(1, getAddresses(currentChain).aggregatorMock1);
	await sleep(10000);
	console.log('added price feed');

	await priceFeedProvider.upsertFeed(2, getAddresses(currentChain).aggregatorMock2);
	await sleep(10000);
	console.log('added price feed2');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
