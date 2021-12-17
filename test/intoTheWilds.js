const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('IntoTheWilds', function () {
	let merals;
	let wilds;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];

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

		it('Should add land', async function () {
			let remainingELFx = 10000;
			let emissionRate = 20;
			let defBonus = 1800;
			let damageRate = 500;
			await wilds.addLand(7, 10, 10, [3, 4, 5], [4, 5, 6], remainingELFx, emissionRate, defBonus, damageRate);
			let land = await wilds.landPlots(7);

			expect(land.defBonus).to.equal(defBonus);
			expect(land.damageRate).to.equal(damageRate);
			expect(land.emissionRate).to.equal(emissionRate);
			expect(land.remainingELFx).to.equal(remainingELFx);
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
			await expect(wilds.connect(player2).unstake(11)).to.be.revertedWith('admin only');

			await expect(wilds.connect(player1).unstake(12)).to.be.revertedWith('admin only');
			await expect(wilds.unstake(1)).to.be.revertedWith('not staked');

			await expect(wilds.addLand(1, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100, 100)).to.be.revertedWith('already land');
			await expect(wilds.connect(player1).addLand(12, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100, 100)).to.be.revertedWith('admin only');
		});

		it('Should stake into land1', async function () {
			await wilds.stake(1, 10, 1);
			expect(await merals.ownerOf(10)).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.unstake(10);
			expect(await merals.ownerOf(10)).to.equal(admin.address);

			await wilds.connect(player1).stake(1, 11, 1);
			expect(await merals.ownerOf(11)).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.connect(player1).unstake(11);
			expect(await merals.ownerOf(11)).to.equal(player1.address);

			// // admin unstake
			await wilds.connect(player1).stake(1, 20, 1);
			await network.provider.send('evm_increaseTime', [day]);
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
				let timeStaked = 86401;
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
			it('Should test ambient drain formula', async function () {
				let meralId = 5;
				let landId = 1;

				await merals.changeScore(meralId, 1000, true, 0);
				await wilds.stake(landId, meralId, 1);

				let meral = await merals.getEthemeral(meralId);
				let land = await wilds.landPlots(landId);
				let defBonus = land.defBonus;
				let damageRate = land.damageRate;

				let defenceMod = (meral.def * day) / defBonus;
				let calculatedDamage = Math.floor((day - defenceMod) / damageRate);

				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');

				let calculatedHealth = await wilds.calculateHealth(meralId);

				await wilds.unstake(meralId);

				let unstakedHealth = await wilds.calculateHealth(meralId);
				let finalHealth = await merals.getEthemeral(meralId);

				expect(calculatedHealth).to.equal(unstakedHealth);
				expect(calculatedHealth).to.equal(finalHealth.score);
				expect(1000 - calculatedDamage).to.equal(finalHealth.score);
			});

			it('Should - 100 from defBonus on each defender stake', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let defBonusStart = land.defBonus;
				await wilds.stake(landId, 1, 1);
				await wilds.stake(landId, 2, 1);
				await wilds.stake(landId, 3, 1);
				await wilds.stake(landId, 4, 1);
				await wilds.stake(landId, 5, 1);

				land = await wilds.landPlots(landId);
				let defBonusEnd = land.defBonus;

				expect(defBonusStart - defBonusEnd).to.equal(500);
			});

			it.only('Should - stake 10 defenders and unstake 10 defenders', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let defBonusStart = land.defBonus;
				for (let i = 1; i < 11; i++) {
					await merals.changeScore(i, 1000, true, 0);
					await wilds.stake(landId, i, 1);
					if (i === 5) {
						landId = 2;
					}

					//DEBUG
					let stake = await wilds.getStake(i);
					console.log(stake.timestamps, 'timestamps');

					let value = await wilds.getStakeEvents(stake.landId, stake.timestamps[0]);
					// console.log(value);
					console.log(value.defBonus, 'defBonus');
					console.log(value.damageRate, 'damageRate');
				}

				await network.provider.send('evm_increaseTime', [3600]);
				await network.provider.send('evm_mine');

				for (let i = 1; i < 11; i++) {
					//DEBUG
					let stake = await wilds.getStake(i);
					console.log(stake.timestamps, 'timestamps');

					let value = await wilds.getStakeEvents(stake.landId, stake.timestamps[stake.timestamps.length - 1]);
					// console.log(value);
					console.log(value.defBonus, 'defBonus');
					console.log(value.damageRate, 'damageRate');
				}

				await network.provider.send('evm_increaseTime', [day * 4]);
				await network.provider.send('evm_mine');

				for (let i = 1; i < 11; i++) {
					await wilds.unstake(i);
					let meral = await merals.getEthemeral(i);
					console.log(meral.score, meral.def);

					//DEBUG
					if (i < 10) {
						let stake = await wilds.getStake(i + 1);
						console.log(stake.timestamps, 'timestamps');

						let value = await wilds.getStakeEvents(stake.landId, stake.timestamps[stake.timestamps.length - 1]);
						// console.log(value);
						console.log(value.defBonus, 'defBonus');
						console.log(value.damageRate, 'damageRate');
					}
				}
			});
		});
	});
});
