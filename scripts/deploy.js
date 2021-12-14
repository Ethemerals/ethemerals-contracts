// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

// async function main() {

//   const Ethemerals = await hre.ethers.getContractFactory('Ethemerals');
//   const ethemerals = await Ethemerals.deploy('https://api.ethemerals.com/api/', "0x169310e61e71ef5834ce5466c7155d8a90d15f1e"); // RANDOM ADDRESS

// 	await ethemerals.deployed();

// 	console.log('ethemerals deployed to:', ethemerals.address);
// }

async function main() {
	const IntoTheWilds = await hre.ethers.getContractFactory('IntoTheWilds');
	const intoTheWilds = await IntoTheWilds.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS

	await intoTheWilds.deployed();

	console.log('wilds deployed to:', intoTheWilds.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
