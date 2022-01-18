const hre = require('hardhat');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	// L2 Contracts
	console.log(admin.address);
	const MeralManager = await ethers.getContractFactory('MeralManager');
	meralManager = await MeralManager.deploy(); // TODO random register
	await meralManager.deployed();
	console.log('meralManager deployed to:', meralManager.address);
	await sleep(4000);

	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	meralsL2 = await EthemeralsL2.deploy(meralManager.address);
	await meralsL2.deployed();
	console.log('meralsL2 deployed to:', meralsL2.address);
	await sleep(4000);

	// register
	await meralManager.addMeralContract(1, meralsL2.address);
	console.log('register meralL2 contract');
	await sleep(4000);

	// approvals
	await meralManager.addGM(admin.address, true);
	console.log('add admin gm');
	await sleep(4000);

	await meralManager.addGM(meralsL2.address, true);
	console.log('add meralsL2 gm');
	await sleep(4000);

	// // L2 Wilds Contracts
	// const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
	// wildsAdminActions = await WildsAdminActions.deploy();
	// await wildsAdminActions.deployed();
	// console.log('wildsAdminActions deployed to:', wildsAdminActions.address);

	// const WildsStaking = await ethers.getContractFactory('WildsStaking');
	// wildsStaking = await WildsStaking.deploy();
	// await wildsStaking.deployed();
	// console.log('wildsStaking deployed to:', wildsStaking.address);

	// const WildsActions = await ethers.getContractFactory('WildsActions');
	// wildsActions = await WildsActions.deploy();
	// await wildsActions.deployed();
	// console.log('wildsActions deployed to:', wildsActions.address);

	// const Wilds = await ethers.getContractFactory('Wilds');
	// wilds = await Wilds.deploy(meralManager.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
	// await wilds.deployed();
	// console.log('wilds deployed to:', wilds.address);

	// const Onsen = await ethers.getContractFactory('Onsen');
	// onsen = await Onsen.deploy(meralManager.address);
	// await onsen.deployed();
	// console.log('onsen deployed to:', onsen.address);

	// await meralManager.addMeralContracts(1, meralsL2.address);
	// console.log('add meral contracts');
	// await meralManager.addGM(onsen.address, true);
	// console.log('add onsen gm');
	// await meralManager.addGM(wilds.address, true);
	// console.log('add wilds gm');
	// await meralManager.addGM(admin.address, true);
	// console.log('set admin as gm');

	// await meralsL2.addDelegate(meralManager.address, true);
	// console.log('add meralManager delegate');
	// await meralsL2.setEscrowAddress(admin.address);
	// console.log('set admin as escrow');

	// // mint 30 to admin, effectively making a new meral contract, using graph stats
	// for (let i = 1; i <= 30; i++) {
	// 	let meralStats = allMeralStats[i];
	// 	await meralsL2.migrateMeral(i, admin.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
	// 	await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
	// 	console.log('minted and registered', i);
	// }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
