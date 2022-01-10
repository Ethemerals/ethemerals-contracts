const hre = require('hardhat');

const meralsL2Address = '0x4778F420D9a1827e77bd4FB54EcAB65783062fB5';
const meralManagerAddress = '0x1F4d4cDb96801A343492527b96E2C4dE7Bda5b74';

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
