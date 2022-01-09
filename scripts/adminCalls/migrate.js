const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0xB52c5C0B23b852783Ef99a64daEE9FbCE58B60f5';
const meralManagerAddress = '0xC9e774d46FDa53A30952aAf1cD898C6B28Af2B56';
const wildsAddress = '0xbFe21e0B7268795DCb42e1EC367B2AEe0817B970';
const onsenAddress = '0x14D0c9eae41Ac31E874d61746c2a088C168468e0';
const escrowL2Address = '0x60F99755E830A25BFBd085826Bc4fA453932D5C3';

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

	// await meralsL2.setMeralManager(meralManagerAddress);

	// NODE BACKEND MINT (MIGRATE) TO L2
	// await meralManager.addGM(admin.address, true);
	// await meralManager.addGM(meralsL2.address, true);
	// await meralManager.addMeralContracts(1, meralsL2.address);
	// await meralsL2.setEscrowAddress(escrowL2.address);

	for (let i = 101; i <= 232; i++) {
		let meralStats = allMeralStats[i];
		await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		console.log('migrated', i);
	}
	// for (let i = 1; i <= 1; i++) {
	// 	await escrowL2.transferToOwner(i, admin.address, i);
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
