const hre = require('hardhat');

const meralsL2Address = '0x15FdA876f5d2B43a71daE62c5F285fcC4A872982';
const meralManagerAddress = '0xC271208b180f572d002f249A092f5DdEdE233b46';

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
