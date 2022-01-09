const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0x40fE7A2140354323F5c45c31dA16F4d9A93a20eD';
const meralManagerAddress = '0xdF870c500E2Ab7b676eF7219524438cA8828F9cD';
const wildsAddress = '0xbFe21e0B7268795DCb42e1EC367B2AEe0817B970';
const onsenAddress = '0x14D0c9eae41Ac31E874d61746c2a088C168468e0';
const escrowL2Address = '0xAB919bDbe7308CFdBaD24b512c270A901b9647e6';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	const meralsL2 = await EthemeralsL2.attach(meralsL2Address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(meralManagerAddress);

	const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
	const escrowL2 = await EscrowL2.attach(escrowL2Address);

	await escrowL2.transferToOwner(7, '0x67256aB8E993Ed8647CBc4723883F4936058dfF2', 3);
	// let value = await escrowL2.ethemerals();
	// console.log(value);
	// value = await meralsL2.ownerOf(7);
	// console.log(value, escrowL2.address);

	// await meralsL2.setMeralManager(meralManagerAddress);

	// NODE BACKEND MINT (MIGRATE) TO L2
	// await meralManager.addGM(admin.address, true);
	// await meralManager.addGM(meralsL2.address, true);
	// await meralManager.addMeralContracts(1, meralsL2.address);
	await meralsL2.setEscrowAddress(escrowL2Address);

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