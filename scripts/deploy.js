const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../test/utils');
let allMeralStats = MeralsL1Data();

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();
	// L1 Contracts
	// const Ethemerals = await ethers.getContractFactory('Ethemerals');
	// const merals = await Ethemerals.attach(EthemeralsAddress_4);

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	escrowL1 = await EscrowL1.deploy(EthemeralsAddress_4); // RANDOM ADDRESS
	await escrowL1.deployed();

	// L2 Contracts
	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	meralsL2 = await EthemeralsL2.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
	await meralsL2.deployed();

	const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
	escrowL2 = await EscrowL2.deploy(meralsL2.address); // RANDOM ADDRESS
	await escrowL2.deployed();

	const MeralManager = await ethers.getContractFactory('MeralManager');
	meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // TODO random register
	await meralManager.deployed();

	// L2 Wilds Contracts
	const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
	wildsAdminActions = await WildsAdminActions.deploy();
	await wildsAdminActions.deployed();

	const WildsStaking = await ethers.getContractFactory('WildsStaking');
	wildsStaking = await WildsStaking.deploy();
	await wildsStaking.deployed();

	const WildsActions = await ethers.getContractFactory('WildsActions');
	wildsActions = await WildsActions.deploy();
	await wildsActions.deployed();

	const Wilds = await ethers.getContractFactory('Wilds');
	wilds = await Wilds.deploy(meralManager.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
	await wilds.deployed();

	const Onsen = await ethers.getContractFactory('Onsen');
	onsen = await Onsen.deploy(meralManager.address);
	await onsen.deployed();

	console.log('onsen deployed to:', onsen.address);
	console.log('wilds deployed to:', wilds.address);
	console.log('wildsAdminActions deployed to:', wildsAdminActions.address);
	console.log('wildsStaking deployed to:', wildsStaking.address);
	console.log('wildsActions deployed to:', wildsActions.address);
	console.log('meralManager deployed to:', meralManager.address);
	console.log('escrowL2 deployed to:', escrowL2.address);
	console.log('meralsL2 deployed to:', meralsL2.address);
	console.log('escrowL1 deployed to:', escrowL1.address);

	await meralManager.addMeralContracts(1, meralsL2.address);
	console.log('add meral contracts');
	await meralManager.addGM(onsen.address, true);
	console.log('add onsen gm');
	await meralManager.addGM(wilds.address, true);
	console.log('add wilds gm');
	await meralManager.addGM(admin.address, true);
	console.log('set admin as gm');

	await meralsL2.addDelegate(meralManager.address, true);
	console.log('add meralManager delegate');
	await meralsL2.setEscrowAddress(admin.address);
	console.log('set admin as escrow');

	// mint 30 to admin, effectively making a new meral contract, using graph stats
	for (let i = 1; i <= 30; i++) {
		let meralStats = allMeralStats[i];
		await meralsL2.migrateMeral(i, admin.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
		await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		console.log('minted and registered', i, meralStats);
	}
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
