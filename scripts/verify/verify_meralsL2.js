const hre = require('hardhat');

const meralsL2Address = '0xe79c5EcAC5aA829b5E6082C42915B5a430c0A9F2';
const meralManagerAddress = '0x8d3Ebf0213C44Caac6CC06646e8445CD2985D767';

async function main() {
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	await hre.run('verify:verify', {
		address: meralsL2Address,
		constructorArguments: [meralManagerAddress],
	});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
