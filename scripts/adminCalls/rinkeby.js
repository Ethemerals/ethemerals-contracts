const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const EthemeralsAddress_4 = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';
const EscrowL1Address_4 = '0x691ac8428BBD2Cf1e9e88Fe11CEE6E3a542Db28B';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const Ethemerals = await ethers.getContractFactory('Ethemerals');
	const merals = await Ethemerals.attach(EthemeralsAddress_4);

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	const escrowL1 = await EscrowL1.attach(EscrowL1Address_4);

	// await merals.addDelegate(EscrowL1Address_4, true);

	await escrowL1.transferToOwner(166, admin.address, 3);
	await escrowL1.transferToOwner(163, admin.address, 4);
	await escrowL1.transferToOwner(157, admin.address, 5);
	await escrowL1.transferToOwner(151, admin.address, 6);
	await escrowL1.transferToOwner(9, admin.address, 7);
	await escrowL1.transferToOwner(8, admin.address, 8);
	await escrowL1.transferToOwner(7, admin.address, 9);
	await escrowL1.transferToOwner(5, admin.address, 10);
	await escrowL1.transferToOwner(4, admin.address, 11);
	await escrowL1.transferToOwner(10, admin.address, 12);

	// const MeralManager = await ethers.getContractFactory('MeralManager');
	// const meralManager = await MeralManager.attach(meralManagerAddress);

	// const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
	// const escrowL2 = await EscrowL2.attach(escrowL2Address);

	// await meralsL2.setMeralManager(meralManagerAddress);

	// NODE BACKEND MINT (MIGRATE) TO L2
	// await meralManager.addGM(admin.address, true);
	// await meralManager.addGM(meralsL2.address, true);
	// await meralManager.addMeralContracts(1, meralsL2.address);
	// await meralsL2.setEscrowAddress(escrowL2.address);

	// for (let i = 2; i <= 40; i++) {
	// 	let meralStats = allMeralStats[i];
	// 	await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
	// }

	// await meralManager.addMeralContracts(1, meralsL2Address);
	// console.log('add meral contracts');
	// await meralManager.addGM(onsenAddress, true);
	// console.log('add onsen gm');
	// await meralManager.addGM(wildsAddress, true);
	// console.log('add wilds gm');
	// await meralManager.addGM(admin.address, true);
	// console.log('set admin as gm');

	// mint 30 to admin, effectively making a new meral contract, using graph stats
	// for (let i = 2; i <= 30; i++) {
	// 	let meralStats = allMeralStats[i];
	// 	await meralsL2.migrateMeral(i, admin.address, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd);
	// 	await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
	// 	console.log('minted and registered', i);
	// }
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
