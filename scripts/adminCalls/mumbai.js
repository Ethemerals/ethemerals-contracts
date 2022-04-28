const { ethers } = require('hardhat');
const hre = require('hardhat');
const { getIdFromType } = require('../../test/utils');
const { getAddresses, currentChain } = require('./addresses');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const merals = await MeralManager.attach(getAddresses(currentChain).meralManager);

	const PriceFeedProvider = await ethers.getContractFactory('PriceFeedProvider');
	const priceFeed = await PriceFeedProvider.attach(getAddresses(currentChain).priceFeedProvider);

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	const battle = await EternalBattle.attach(getAddresses(currentChain).eternalBattle);

	// await merals.addGM(battle.address, true);
	// await sleep(10000);
	// console.log('added battle GM');

	value = await battle.getGamePair(1);
	console.log(value);

	value = await priceFeed.getLatestPrice(1);
	console.log(value);

	value = await merals.isApprovedForAll(admin.address, battle.address);
	console.log(value);

	await battle.createStake(1000510, 1, 500, true);

	// await priceFeed.upsertFeed(1, getAddresses(currentChain).aggregatorMock1);
	// await sleep(10000);
	// console.log('added price feed');

	// await priceFeed.upsertFeed(2, getAddresses(currentChain).aggregatorMock2);
	// await sleep(10000);
	// console.log('added price feed2');

	// await battle.cancelStakeAdmin(getIdFromType(1, 116));
	// await battle.setCMIDBonus([825, 3408, 4687, 7129, 2563, 4943], 2, true, true);
	// await battle.setCMIDBonus([1, 3717, 4023], 2, true, true);

	// value = await battle.getChange(1000510);
	// console.log(value[0].toString());

	// value = await merals.getTypeByContract(getAddresses(chain).merals);
	// console.log(value);
	// await sleep(4000);

	// let tokenId = 510;
	// await merals.registerMeral(getAddresses(currentChain).merals, tokenId, 5426, 2000, 300, 609, 199, 731, 16, 8);
	// await sleep(4000);
	// value = await merals.getMeralById(getIdFromType(1, 116));
	// console.log(value);

	// await sleep(4000);
	// await merals.mintMeral(getIdFromType(1, tokenId));
	// await sleep(4000);
	// value = await merals.getMeralById(getIdFromType(1, tokenId));
	// console.log(value);

	// console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
