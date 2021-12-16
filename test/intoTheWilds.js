const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('IntoTheWilds', function () {
	let merals;
	let wilds;
	let admin;
	let player1;
	let player2;
	let player3;

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS
		await merals.deployed();

		const IntoTheWilds = await ethers.getContractFactory('IntoTheWilds');
		wilds = await IntoTheWilds.deploy(merals.address);
		await wilds.deployed();

		// mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// set and allow delegates
		await merals.addDelegate(wilds.address, true);
		await merals.addDelegate(admin.address, true);
		await merals.setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);
	});

	describe('Deployment', function () {
		it('Should set the right admin', async function () {
			expect(await wilds.admin()).to.equal(admin.address);
		});

		it('Should add 6 lands and not more', async function () {
			let land6 = await wilds.landPlots(6);
			expect(land6.remainingELFx.toString()).to.not.equal('0');

			let land7 = await wilds.landPlots(7);
			expect(land7.remainingELFx.toString()).to.equal('0');
		});
	});

	describe('Staking and Unstaking', function () {
		it('Should try to stake and unstake but revert', async function () {
			await expect(wilds.stake(1, 11, 1)).to.be.revertedWith('ERC721: transfer of token that is not own');

			await wilds.stake(1, 5, 1);
			await expect(wilds.stake(1, 5, 1)).to.be.revertedWith('already staked');

			await expect(wilds.stake(7, 6, 1)).to.be.revertedWith('not land');

			await expect(wilds.stake(2, 6, 5)).to.be.revertedWith('not action');
			await expect(wilds.stake(2, 6, 0)).to.be.revertedWith('not action');
			await expect(wilds.stake(2, 6, 2)).to.be.revertedWith('need defender');
			await wilds.stake(1, 6, 2); // allow

			await wilds.connect(player1).stake(1, 11, 1);
			expect(await merals.ownerOf(11)).to.equal(wilds.address);
			await expect(wilds.connect(player1).unstake(11)).to.be.revertedWith('cooldown');
			await expect(wilds.connect(player2).unstake(11)).to.be.revertedWith('owner only');

			await expect(wilds.connect(player1).unstake(12)).to.be.revertedWith('owner only');
		});

		it('Should stake into land1', async function () {
			await wilds.stake(1, 10, 1);
			expect(await merals.ownerOf(10)).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [3600]);
			await network.provider.send('evm_mine');
			await wilds.unstake(10);
			expect(await merals.ownerOf(10)).to.equal(admin.address);

			await wilds.connect(player1).stake(1, 11, 1);
			expect(await merals.ownerOf(11)).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [3600]);
			await network.provider.send('evm_mine');
			await wilds.connect(player1).unstake(11);
			expect(await merals.ownerOf(11)).to.equal(player1.address);

			// // admin unstake
			await wilds.connect(player1).stake(1, 20, 1);
			await network.provider.send('evm_increaseTime', [3600]);
			await network.provider.send('evm_mine');
			await wilds.unstake(20);
			expect(await merals.ownerOf(20)).to.equal(player1.address);
		});

		it('Should stake into land1 but not more then maxSlot', async function () {
			let slots = 5;
			await wilds.setMaxSlots(slots);
			await wilds.stake(1, 1, 1);
			await wilds.stake(1, 2, 1);
			await wilds.stake(1, 3, 1);
			await wilds.stake(1, 4, 1);
			await wilds.stake(1, 5, 1);

			await expect(wilds.stake(1, 6, 1)).to.be.revertedWith('full');

			slots = 6;
			await wilds.setMaxSlots(slots);
			await wilds.stake(1, 6, 1);
			await wilds.stake(1, 7, 2);
		});

		describe('Adding Land Claim Points', function () {
			it('Should stake as defender and add LCP', async function () {
				let timeStaked = 3600;
				let timeStaked2 = 2592000;

				await wilds.stake(1, 1, 1);

				await network.provider.send('evm_increaseTime', [timeStaked]);
				await wilds.unstake(1);
				let lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.equal(timeStaked);

				await wilds.stake(1, 1, 1); // +1 second

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(1);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.equal(timeStaked + timeStaked2);

				await wilds.stake(1, 2, 1);

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(2);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.equal(timeStaked + timeStaked2); // NOT ADD MORE FOR ID1
			});
		});

		describe('Defend and drain HP', function () {
			it('Should drain HP as defender', async function () {
				let meralId = 1;
				let [min, hour, day, week] = [60, 3600, 86400, 604800];

				await merals.changeScore(meralId, 1000, true, 0);
				await wilds.stake(1, meralId, 1);

				let value = await wilds.calculateHealth(meralId);
				console.log(value, 'starting');
				value = await merals.getEthemeral(meralId);
				console.log(value);

				await network.provider.send('evm_increaseTime', [min]);
				await network.provider.send('evm_mine');
				value = await wilds.calculateHealth(meralId);
				console.log(value, '1min');

				await network.provider.send('evm_increaseTime', [hour - min]);
				await network.provider.send('evm_mine');
				value = await wilds.calculateHealth(meralId);
				console.log(value, '1hr');

				await network.provider.send('evm_increaseTime', [day - hour - min]);
				await network.provider.send('evm_mine');
				value = await wilds.calculateHealth(meralId);
				console.log(value, '1day');

				await network.provider.send('evm_increaseTime', [week - day - hour - min]);
				await network.provider.send('evm_mine');
				value = await wilds.calculateHealth(meralId);
				console.log(value, '1week');
				value = await wilds.calculateLCP(1, meralId);
				console.log(value, 'calculateLCP');

				await wilds.unstake(meralId);

				value = await wilds.calculateHealth(meralId);
				console.log(value, 'calculateHealth');

				value = await merals.getEthemeral(meralId);
				console.log(value.score, 'getEthemeral');

				value = await wilds.calculateLCP(1, meralId);
				console.log(value, 'calculateLCP');
				value = await wilds.getLCP(1, meralId);
				console.log(value, 'getLCP');
			});
		});
	});
});
