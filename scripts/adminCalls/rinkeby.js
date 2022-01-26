const hre = require('hardhat');
const { getAddresses } = require('./addresses');

let chain = 4;

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const Ethemerals = await ethers.getContractFactory('Ethemerals');
	const merals = await Ethemerals.attach(getAddresses(chain).merals);

	const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
	const escrowL1 = await EscrowL1.attach(getAddresses(chain).escrowL1);

	let value = await merals.ownerOf(435);
	console.log(value);

	// await escrowL1.withdraw(1, 273);
	// value = await merals.ownerOf(130);
	// console.log(value);
	// value = await merals.ownerOf(236);
	// console.log(value);
	// value = await merals.ownerOf(245);
	// console.log(value);
	// value = await merals.ownerOf(269);
	// console.log(value);
	// value = await merals.ownerOf(277);
	// console.log(value);
	// value = await merals.ownerOf(284);
	// console.log(value);
	// value = await merals.ownerOf(303);
	// console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
