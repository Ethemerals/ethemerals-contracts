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
			let baseDefence = 1800;
			let baseDamage = 500;
			await wilds.addLand(7, 10, 10, [3, 4, 5], [4, 5, 6], remainingELFx, emissionRate, baseDefence, baseDamage);
			let land = await wilds.landPlots(7);

			expect(land.baseDefence).to.equal(baseDefence);
			expect(land.baseDamage).to.equal(baseDamage);
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
			it('Should minus 120 from baseDefence on each defender stake', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let baseDefenceStart = land.baseDefence;
				for (let i = 1; i <= 5; i++) {
					await wilds.stake(landId, i, 1);
				}

				land = await wilds.landPlots(landId);
				let baseDefenceEnd = land.baseDefence;

				expect(baseDefenceStart - baseDefenceEnd).to.equal(600);
			});

			it('Should calculate change over days', async function () {
				let meralDef = 5000;
				let baseDefence = 2000;
				let extraDefBonus = 120;
				let baseDamage = 600;
				let atk = 80;
				let period = day * 1;
				let totalChange = 0;
				let change;

				// 1 defender 0 attackers max
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus, baseDamage);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 0');

				// 1 defender 1 attackers max
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus, baseDamage - atk);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 1');

				// 1 defender 5 attackers max attack bonus
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus, baseDamage - atk * 5);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 5');

				// 5 defender 5 attackers max attack bonus
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus * 5, baseDamage - atk * 5);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 5');

				// 5 defender 1 attackers max attack bonus
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus * 5, baseDamage - atk);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 1');

				// 5 defender 0 attackers max attack bonus
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence - extraDefBonus * 5, baseDamage);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 0');
			});

			it('Should minus some value from baseDamage on each attacker stake', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let baseDamage = land.baseDamage;
				await wilds.stake(landId, 10, 1);

				for (let i = 1; i <= 5; i++) {
					await wilds.stake(landId, i, 2);
					land = await wilds.landPlots(landId);
					console.log(land.baseDamage, 'baseDamage');
					expect(baseDamage).to.be.gt(land.baseDamage);
					baseDamage = land.baseDamage;
				}

				await network.provider.send('evm_increaseTime', [day * 2]);
				await network.provider.send('evm_mine');

				for (let i = 1; i <= 5; i++) {
					await wilds.unstake(i);
					land = await wilds.landPlots(landId);
					console.log(land.baseDamage, 'baseDamage');
					expect(baseDamage).to.be.lt(land.baseDamage);
					baseDamage = land.baseDamage;
				}
			});

			it.only('Should stake and unstake and reduce HP', async function () {
				let landId = 1;

				for (let i = 1; i < 2; i++) {
					await merals.changeScore(i, 1000, true, 0);
					await wilds.stake(landId, i, 1);

					await network.provider.send('evm_increaseTime', [day]);
					await network.provider.send('evm_mine');

					if (i === 5) {
						landId = 2;
					}
				}

				await network.provider.send('evm_increaseTime', [hour * 1]);
				await network.provider.send('evm_mine');

				for (let i = 1; i < 2; i++) {
					let healthChange = await wilds.calculateHealth(i);
					let lcp = await wilds.calculateLCP(landId, i);
					if (i === 5) {
						landId = 2;
					}
					console.log(healthChange.toString(), `token id #${i}`, lcp.toString(), 'LCP');
					await wilds.unstake(i);
					let meral = await merals.getEthemeral(i);
					console.log(1000 - meral.score, meral.def, i);
					// if (meral.score > 1) {
					// 	expect(meral.score).to.be.equal(1000 - parseInt(healthChange));
					// }
				}

				// //DEBUG
				// let stake = await wilds.getStake(i);
				// console.log(stake.timestamps, 'timestamps');

				// let value = await wilds.getStakeEvents(stake.landId, stake.timestamps[0]);
				// // console.log(value);
				// console.log(value.baseDefence, 'baseDefence');
				// console.log(value.baseDamage, 'baseDamage');
			});

			it('Should - stake 10 defenders and unstake 10 defenders', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let baseDefenceStart = land.baseDefence;
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
					console.log(value.baseDefence, 'baseDefence');
					console.log(value.baseDamage, 'baseDamage');
				}

				await network.provider.send('evm_increaseTime', [3600]);
				await network.provider.send('evm_mine');

				for (let i = 1; i < 11; i++) {
					//DEBUG
					let stake = await wilds.getStake(i);
					console.log(stake.timestamps, 'timestamps');

					let value = await wilds.getStakeEvents(stake.landId, stake.timestamps[stake.timestamps.length - 1]);
					// console.log(value);
					console.log(value.baseDefence, 'baseDefence');
					console.log(value.baseDamage, 'baseDamage');
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
						console.log(value.baseDefence, 'baseDefence');
						console.log(value.baseDamage, 'baseDamage');
					}
				}
			});
		});
	});
});
