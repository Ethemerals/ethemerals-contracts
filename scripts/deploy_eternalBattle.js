const hre = require('hardhat');
const { getAddresses } = require('./adminCalls/addresses');

let chain = 4;

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

	// const AggregatorV3Mock = await ethers.getContractFactory('AggregatorV3Mock');
	// aggV3Mock1 = await AggregatorV3Mock.deploy(8, 1);
	// await aggV3Mock1.deployed();

	// console.log('aggV3Mock1 deployed to:', aggV3Mock1.address);
	// await sleep(10000);

	// aggV3Mock2 = await AggregatorV3Mock.deploy(18, 1);
	// await aggV3Mock2.deployed();

	// console.log('aggV3Mock2 deployed to:', aggV3Mock1.address);
	// await sleep(10000);

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	battle = await EternalBattle.deploy(getAddresses(chain).meralManager, priceFeedProvider.address);
	await battle.deployed();

	console.log('Battle deployed to:', battle.address);
	await sleep(10000);

	await battle.resetGamePair(1, true);
	await sleep(10000);
	await battle.resetGamePair(2, true);
	await sleep(10000);
	console.log('reset game pair');

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(chain).meralManager);

	await meralManager.addGM(battle.address, true);
	await sleep(10000);
	console.log('added battle GM');

	await priceFeedProvider.upsertFeed(1, getAddresses(chain).aggregatorMock1);
	await sleep(10000);
	console.log('added price feed');

	await priceFeedProvider.upsertFeed(2, getAddresses(chain).aggregatorMock2);
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
