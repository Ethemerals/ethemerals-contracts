const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0xc4f58128c639a6E2d9F2EcFA7C9c5EC00D0965B3';
const meralManagerAddress = '0x177E93232F4c2bc3903aDdBe5f8cBACCa7A451a7';
const wildsAddress = '0xbFe21e0B7268795DCb42e1EC367B2AEe0817B970';
const onsenAddress = '0x14D0c9eae41Ac31E874d61746c2a088C168468e0';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	const meralsL2 = await EthemeralsL2.attach(meralsL2Address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(meralManagerAddress);

	// await meralsL2.addDelegate(meralManagerAddress, true);
	// console.log('add meralManager delegate');
	// await meralsL2.setEscrowAddress(admin.address);
	// console.log('set admin as escrow');

	// await meralManager.addMeralContracts(1, meralsL2Address);
	// console.log('add meral contracts');
	// await meralManager.addGM(onsenAddress, true);
	// console.log('add onsen gm');
	// await meralManager.addGM(wildsAddress, true);
	// console.log('add wilds gm');
	// await meralManager.addGM(admin.address, true);
	// console.log('set admin as gm');

	// mint 30 to admin, effectively making a new meral contract, using graph stats
	for (let i = 2; i <= 30; i++) {
		let meralStats = allMeralStats[i];
		await meralsL2.migrateMeral(i, admin.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
		await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		console.log('minted and registered', i);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
