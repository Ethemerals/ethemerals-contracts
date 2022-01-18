const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0xe79c5EcAC5aA829b5E6082C42915B5a430c0A9F2';
const meralManagerAddress = '0x6eB5E38b2ecAD8759575a3C59254b32FAA84A257';
const admin2Address = '0xe5742E53c2849e0158fD89e417688E0e11c36AE3';
const admin1Address = '0x6b013Cfe4b23Ee60668400D2D64aC15034dFDf68';

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	const meralsL2 = await EthemeralsL2.attach(meralsL2Address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(meralManagerAddress);

	await meralsL2.transferOwnership(admin1Address);
	console.log('transferowner');

	// for (let i = 1; i <= 348; i++) {
	// 	try {
	// 		let meralStats = allMeralStats[i];
	// 		// await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
	// 		// await sleep(10000);

	// 		let exists = await meralsL2.exists(i);
	// 		if (!exists) {
	// 			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
	// 			await sleep(10000);
	// 		}
	// 		await sleep(1000);
	// 		console.log(i, exists);

	// 		// let value = await meralManager.getMeral(1, i);
	// 		// console.log('tokenId:', i, value.subclass);
	// 		// await sleep(1000);
	// 		// let owner = await meralsL2.ownerOf(i);
	// 		// if (owner.toLowerCase() !== meralManagerAddress.toLowerCase()) {
	// 		// 	console.log('no owner', i);
	// 		// }
	// 	} catch (error) {
	// 		console.log(error, i);
	// 	}
	// }
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
