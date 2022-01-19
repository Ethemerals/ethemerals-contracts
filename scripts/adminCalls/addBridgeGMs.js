const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
const { BridgeGM3, BridgeGM1, BridgeGM2, meralsL2Address, meralManagerAddress } = require('./addresses');
let allMeralStats = MeralsL1Data();

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

	await meralManager.addGM(meralsL2Address, true);
	// await meralManager.addGM(meralsL2Address, true);
	await sleep(1000);
	// await meralsL2.addDelegate('0x6b013Cfe4b23Ee60668400D2D64aC15034dFDf68', true);
	// await sleep(1000);

	// await meralManager.addGM(BridgeGM1, true);
	// await sleep(10000);
	// await meralManager.addGM(BridgeGM2, true);
	// await sleep(10000);
	// await meralManager.addGM(BridgeGM3, true);
	// await sleep(10000);
	// console.log('set gm');

	// await meralsL2.addDelegate(BridgeGM1, true);
	// await sleep(10000);
	// await meralsL2.addDelegate(BridgeGM2, true);
	// await sleep(10000);
	// await meralsL2.addDelegate(BridgeGM3, true);
	// await sleep(10000);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
