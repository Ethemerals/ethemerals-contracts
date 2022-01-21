const fs = require('fs');
const hre = require('hardhat');
const { meralsL1Address_1 } = require('./addresses');
const metadata = require('../metadata/metadata.json');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}

	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();
	console.log(admin.address);

	const EthemeralsL1 = await ethers.getContractFactory('Ethemerals');
	const meralsL1 = await EthemeralsL1.attach(meralsL1Address_1);

	const allTokens = [];
	for (let i = 0; i <= 1000; i++) {
		let value = await meralsL1.getEthemeral(i);
		let data = metadata[i];

		let meral = {
			tokenId: i,
			atk: value.atk + data.atk,
			def: value.def + data.def,
			spd: value.spd + data.spd,
			element: data.element,
			subclass: data.subclass,
			score: value.score,
			rewards: value.rewards,
		};

		allTokens.push(meral);
		console.log(meral, i);
		await sleep(500);
	}

	let data = JSON.stringify(allTokens);
	fs.writeFileSync('scripts/metadata/migrationData.json', data);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
