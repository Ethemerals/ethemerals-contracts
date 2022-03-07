const hre = require('hardhat');

const metadata = require('../metadata/migrationData.json');
const { getAddresses } = require('./addresses');

const typeMult = 100000;
const getTypeFromId = (id) => {
	return parseInt(parseInt(id) / typeMult);
};

const getTokenIdFromId = (id) => {
	let type = getTypeFromId(id);
	return parseInt(parseInt(id) - parseInt(type) * typeMult);
};

const getIdFromType = (type, tokenId) => {
	return parseInt(parseInt(tokenId) + parseInt(type) * typeMult);
};

let chain = 4;
async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);
	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(chain).meralManager);

	// const Wilds = await ethers.getContractFactory('Wilds');
	// const wilds = await Wilds.attach(getAddresses(chain).wilds);

	// let land = await wilds.landPlots(1);
	// console.log(land, land.baseDefence);

	// let slots = await wilds.getSlots(1, 1);
	// console.log(slots);

	// let value = await meralManager.getMeralById(getIdFromType(1, 264));
	// console.log(value);

	// stakeEvents
	// takes

	// let value = await wilds.stakes(getIdFromType(1, 344));
	// console.log(value);

	// let value = await wilds.getStakeEvents(1);
	// let event1 = value[0];
	// console.log(event1.baseDefence);
	// console.log(value[]);

	// [
	//   BigNumber { value: "1643018615" },
	//   2940,
	//   timestamp: BigNumber { value: "1643018615" },
	//   baseDefence: 2940
	// ],

	// owner: '0x67256aB8E993Ed8647CBc4723883F4936058dfF2',
	// lastAction: BigNumber { value: "1643022489" },
	// entryPointer: 1,
	// damage: 0,
	// health: 0,
	// stamina: 0,
	// landId: 1,
	// stakeAction: 1

	let value = await meralManager.ownerOf(getIdFromType(1, 264));
	console.log(value);
	// value = await meralManager.ownerOf(getIdFromType(1, 387));
	// console.log(value);
	// value = await meralManager.ownerOf(getIdFromType(1, 398));
	// console.log(value);
	// value = await meralManager.ownerOf(getIdFromType(1, 389));
	// console.log(value);
	// value = await meralManager.ownerOf(getIdFromType(1, 406));
	// console.log(value);

	// let value = await meralManager.ownerOf(getIdFromType(1, 344));
	// console.log(value);
	// value = await meralManager.ownerOf(130);
	// console.log(value);
	// value = await meralManager.ownerOf(236);
	// console.log(value);
	// value = await meralManager.ownerOf(245);
	// console.log(value);
	// value = await meralManager.ownerOf(269);
	// console.log(value);
	// value = await meralManager.ownerOf(277);
	// console.log(value);
	// value = await meralManager.ownerOf(284);
	// console.log(value);
	// value = await meralManager.ownerOf(303);
	// console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
