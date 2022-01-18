const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0xe79c5EcAC5aA829b5E6082C42915B5a430c0A9F2';
const meralManagerAddress = '0x6eB5E38b2ecAD8759575a3C59254b32FAA84A257';
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

	// await meralsL2.setMeralManager(meralManagerAddress);
	// console.log('setmeral manager');

	// await meralManager.addMeralContract(1, meralsL2Address);
	// console.log('set contracts');

	await meralManager.addGM(meralsL2.address, true);
	console.log('set gm');

	// const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
	// const escrowL2 = await EscrowL2.attach(escrowL2Address);

	// let value = await escrowL2.ethemerals();
	// console.log(value);
	// value = await meralsL2.ownerOf(7);
	// console.log(value, escrowL2.address);

	// await meralsL2.setMeralManager(meralManagerAddress);

	// NODE BACKEND MINT (MIGRATE) TO L2
	// await meralManager.addGM(admin.address, true);
	// await meralManager.addGM(meralsL2.address, true);
	// await meralManager.addMeralContracts(1, meralsL2.address);
	// await meralsL2.setEscrowAddress(escrowL2Address);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
