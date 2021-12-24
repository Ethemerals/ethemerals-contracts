const { expect } = require('chai');
const { ethers } = require('hardhat');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds', function () {
	let merals;
	let wilds;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];

	const makeRaid = async () => {
		const landId = 1;
		for (let i = 1; i <= 5; i++) {
			await merals.changeScore(i, 1000, true, 0);
			await wilds.stake(landId, i, 1);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}

		for (let i = 11; i <= 15; i++) {
			await wilds.connect(player1).stake(landId, i, 4);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}
	};

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS
		await merals.deployed();

		const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
		wildsAdminActions = await WildsAdminActions.deploy();
		await wildsAdminActions.deployed();

		const WildsStaking = await ethers.getContractFactory('WildsStaking');
		wildsStaking = await WildsStaking.deploy();
		await wildsStaking.deployed();

		const WildsActions = await ethers.getContractFactory('WildsActions');
		wildsActions = await WildsActions.deploy();
		await wildsActions.deployed();

		const Wilds = await ethers.getContractFactory('Wilds');

		wilds = await Wilds.deploy(merals.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
		await wilds.deployed();

		// mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await network.provider.send('evm_increaseTime', [day]);
		await network.provider.send('evm_mine');

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

		it('Should do admin functions', async function () {
			await expect(wilds.connect(player1).setStaminas([1])).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).editLand(1, 100, 10, 1000, 1)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).emergencyUnstake(1)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setPaused(true)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setAdmin(player1.address)).to.be.revertedWith('admin only');
			await expect(wilds.connect(player1).setAddresses(player1.address, player1.address)).to.be.revertedWith('admin only');
			await wilds.editLand(1, 2000, 100, 1000, 1);
			let land = await wilds.landPlots(1);
			expect(land.remainingELFx).to.equal(2000);
			expect(land.emissionRate).to.equal(100);
			expect(land.baseDefence).to.equal(1000);
			expect(land.raidStatus).to.equal(1);

			await makeRaid();
			let stake = await wilds.getStake(1);
			expect(stake.owner).to.equal(admin.address);
			await wilds.emergencyUnstake(1);
			stake = await wilds.getStake(1);
			expect(stake.owner).to.equal(addressZero);
			let slots = await wilds.getSlots(1, 1);
			expect(slots.length).to.equal(0);

			let pause = await wilds.paused();
			expect(pause).to.equal(false);
			await wilds.setPaused(true);
			pause = await wilds.paused();
			expect(pause).to.equal(true);
			await expect(wilds.stake(1, 6, 2)).to.be.revertedWith('paused');
			await wilds.setPaused(false);
			pause = await wilds.paused();
			expect(pause).to.equal(false);

			let stakingValue = await wilds.staking();
			let actionsValue = await wilds.actions();
			expect(stakingValue).to.equal(wildsStaking.address);
			expect(actionsValue).to.equal(wildsActions.address);
			await wilds.setAddresses(player1.address, player2.address);
			stakingValue = await wilds.staking();
			actionsValue = await wilds.actions();
			expect(stakingValue).to.equal(player1.address);
			expect(actionsValue).to.equal(player2.address);

			let adminValue = await wilds.admin();
			expect(adminValue).to.equal(admin.address);
			await wilds.setAdmin(player1.address);
			adminValue = await wilds.admin();
			expect(adminValue).to.equal(player1.address);
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
			await wilds.addLand(7, 10, 10, [3, 4, 5], [4, 5, 6], remainingELFx, emissionRate, baseDefence);
			let land = await wilds.landPlots(7);

			expect(land.baseDefence).to.equal(baseDefence);
			expect(land.emissionRate).to.equal(emissionRate);
			expect(land.remainingELFx).to.equal(remainingELFx);
		});
	});

	describe('Staking and Unstaking', function () {
		it('Should try to stake and unstake but revert', async function () {
			await expect(wilds.stake(1, 11, 1)).to.be.revertedWith('owner only');

			await wilds.stake(1, 5, 1);
			await expect(wilds.stake(1, 5, 1)).to.be.revertedWith('owner only');

			await expect(wilds.stake(7, 6, 1)).to.be.revertedWith('not land');

			await expect(wilds.stake(2, 6, 2)).to.be.revertedWith('need defender');
			await expect(wilds.stake(2, 6, 4)).to.be.revertedWith('not raidable');
			// await wilds.stake(1, 6, 2); // allow TODO

			await wilds.connect(player1).stake(1, 11, 1);
			expect(await merals.ownerOf(11)).to.equal(wilds.address);
			await expect(wilds.connect(player1).unstake(11)).to.be.revertedWith('cooldown');
			await expect(wilds.connect(player2).unstake(11)).to.be.revertedWith('owner only');

			await expect(wilds.connect(player1).unstake(12)).to.be.revertedWith('owner only');
			await expect(wilds.unstake(1)).to.be.revertedWith('not staked');

			await expect(wilds.addLand(1, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100)).to.be.revertedWith('already land');
			await expect(wilds.connect(player1).addLand(12, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100)).to.be.revertedWith('admin only');
		});

		it('Should lock defenders in', async function () {
			for (let i = 1; i <= 5; i++) {
				await wilds.stake(1, i, 1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			await wilds.stake(1, 6, 4);
			await expect(wilds.unstake(1)).to.be.revertedWith('in a raid');

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
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

		it('Should stake into land1 but not more then 5', async function () {
			await wilds.stake(1, 1, 1);
			await wilds.stake(1, 2, 1);
			await wilds.stake(1, 3, 1);
			await wilds.stake(1, 4, 1);
			await wilds.stake(1, 5, 1);

			await expect(wilds.stake(1, 6, 1)).to.be.revertedWith('full');
		});

		it('Should set raid status from 0 to 1 to 2 and to 0', async function () {
			let land = await wilds.landPlots(1);
			await wilds.stake(1, 1, 1);
			await wilds.stake(1, 2, 1);
			await wilds.stake(1, 3, 1);
			await wilds.stake(1, 4, 1);
			expect(land.raidStatus).to.equal(0);
			await wilds.stake(1, 5, 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);
			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.unstake(1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(0);

			await wilds.stake(1, 1, 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);

			// different land
			await wilds.stake(2, 8, 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);

			await wilds.stake(1, 6, 4);
			await wilds.stake(1, 7, 4);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(2);

			await network.provider.send('evm_increaseTime', [day * 10]);
			await network.provider.send('evm_mine');

			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(2);

			for (let i = 1; i <= 5; i++) {
				await wilds.deathKiss(i, 6);
			}

			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(0);
		});

		describe('Adding Land Claim Points', function () {
			it('Should stake as defender and add LCP', async function () {
				let timeStaked = 86401;
				let timeStaked2 = 2592000;

				await wilds.stake(1, 1, 1);

				await network.provider.send('evm_increaseTime', [timeStaked]);

				await wilds.unstake(1);
				let lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked - 1, timeStaked + 1);

				await wilds.stake(1, 1, 1); // +1 second

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(1);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked + timeStaked2 - 1, timeStaked + timeStaked2 + 1);

				await wilds.stake(1, 2, 1);

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(2);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked + timeStaked2 - 1, timeStaked + timeStaked2 + 1); // NOT ADD MORE FOR ID1
			});

			it('Should stake as defender and add LCP', async function () {
				let timeStaked = 86401;
				let timeStaked2 = 2592000;

				await wilds.stake(1, 1, 1);

				await network.provider.send('evm_increaseTime', [timeStaked]);
				await wilds.unstake(1);
				let lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked - 1, timeStaked + 1);

				await wilds.stake(1, 1, 1); // +1 second

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(1);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked + timeStaked2 - 1, timeStaked + timeStaked2 + 1);

				await wilds.stake(1, 2, 1);

				await network.provider.send('evm_increaseTime', [timeStaked2]);
				await wilds.unstake(2);
				lcp = await wilds.getLCP(1, 1);
				expect(lcp).to.be.within(timeStaked + timeStaked2 - 1, timeStaked + timeStaked2 + 1); // NOT ADD MORE FOR ID1
			});
		});

		describe('Defend and drain HP', function () {
			it('Should calculate change over days', async function () {
				let meralDef = 800;
				let extraDefBonus = 140;
				let initBaseDefence = 2800;
				let atk = 100;
				let period = day * 1;
				let totalChange = 0;
				let change;
				let baseDefence;

				// 1 defender 0 attackers max

				baseDefence = initBaseDefence + extraDefBonus;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 0');

				// 1 defender 1 attackers max
				baseDefence = initBaseDefence + extraDefBonus - atk;
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 1');

				// 1 defender 5 attackers max attack bonus
				baseDefence = initBaseDefence + extraDefBonus - atk * 5;
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '1 vs 5');

				// 5 defender 5 attackers max attack bonus
				baseDefence = initBaseDefence + extraDefBonus * 5 - atk * 5;
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 5');

				// 5 defender 1 attackers max attack bonus
				baseDefence = initBaseDefence + extraDefBonus * 5 - atk;
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 1');

				// 5 defender 0 attackers max attack bonus
				baseDefence = initBaseDefence + extraDefBonus * 5;
				totalChange = 0;
				change = await wilds.calculateChange(0, period, meralDef, baseDefence);
				totalChange += parseInt(change);
				console.log(totalChange, '5 vs 0');
			});

			it('Should add 140 from baseDefence on each defender stake', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let baseDefenceStart = land.baseDefence;
				for (let i = 1; i <= 5; i++) {
					await wilds.stake(landId, i, 1);
				}

				land = await wilds.landPlots(landId);
				let baseDefenceEnd = land.baseDefence;

				expect(baseDefenceEnd - baseDefenceStart).to.equal(700);
			});

			it('Should minus some value from baseDefence on each attacker stake', async function () {
				let landId = 1;
				let land = await wilds.landPlots(landId);
				let baseDefence = land.baseDefence;
				for (let i = 11; i <= 15; i++) {
					await wilds.connect(player1).stake(landId, i, 1);
					land = await wilds.landPlots(landId);
					console.log(land.baseDefence, 'baseDefence');
					expect(baseDefence).to.be.lt(land.baseDefence);
					baseDefence = land.baseDefence;
				}

				land = await wilds.landPlots(landId);
				console.log(land.raidStatus, 'raidStatus');

				for (let i = 1; i <= 5; i++) {
					await wilds.stake(landId, i, 4);
					land = await wilds.landPlots(landId);
					console.log(land.baseDefence, 'baseDefence');
					expect(baseDefence).to.be.gt(land.baseDefence);
					baseDefence = land.baseDefence;
				}
			});

			it('Should stake and unstake and reduce HP', async function () {
				let landId = 1;

				for (let i = 1; i < 11; i++) {
					await merals.changeScore(i, 1000, true, 0);
					await wilds.stake(landId, i, 1);

					await network.provider.send('evm_increaseTime', [hour * 6]);
					await network.provider.send('evm_mine');

					// await wilds.connect(player1).stake(landId, i + 10, 4); // ATTACKERS

					if (i === 5) {
						landId = 2;
					}
				}

				await network.provider.send('evm_increaseTime', [day * 2]);
				await network.provider.send('evm_mine');

				// for (let i = 1; i < 11; i++) {
				// 	let healthChange = await wilds.calculateDefenderDamage(i);
				// 	let lcp = await wilds.calculateLCP(landId, i);
				// 	if (i === 5) {
				// 		landId = 2;
				// 	}
				// 	console.log(healthChange.toString(), `token id #${i}`, lcp.toString(), 'LCP');
				// 	await wilds.unstake(i);
				// 	let meral = await merals.getEthemeral(i);
				// 	console.log(1000 - meral.score, meral.def, i);

				// 	expect(meral.score).to.be.equal(1000 - parseInt(healthChange));
				// }

				function shuffle(array) {
					return array.sort(() => Math.random() - 0.5);
				}

				let defId = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
				let atkId = shuffle([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

				for (let i = 0; i < 10; i++) {
					let healthChange = await wilds.calculateDefenderDamage(defId[i]);

					console.log(healthChange.toString(), `token id #${defId[i]}`);
					await wilds.unstake(defId[i]);
					let meral = await merals.getEthemeral(defId[i]);
					console.log(1000 - meral.score, meral.def, defId[i]);

					expect(meral.score).to.be.equal(1000 - parseInt(healthChange));
				}

				landId = 1;
				console.log('round 2');

				for (let i = 1; i < 11; i++) {
					await merals.changeScore(i, 1000, true, 0);
					await wilds.stake(landId, i, 1);

					await network.provider.send('evm_increaseTime', [hour * 6]);
					await network.provider.send('evm_mine');

					if (i === 5) {
						landId = 2;
					}
				}

				await network.provider.send('evm_increaseTime', [day * 2]);
				await network.provider.send('evm_mine');

				for (let i = 0; i < 10; i++) {
					let healthChange = await wilds.calculateDefenderDamage(defId[i]);

					console.log(healthChange.toString(), `token id #${defId[i]}`);
					await wilds.unstake(defId[i]);
					let meral = await merals.getEthemeral(defId[i]);
					console.log(1000 - meral.score, meral.def, defId[i]);

					expect(meral.score).to.be.equal(1000 - parseInt(healthChange));
				}
			});

			it('Should stake and unstake single', async function () {
				let landId = 1;

				await merals.changeScore(1, 1000, true, 0);
				await wilds.stake(landId, 1, 1);

				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');

				let healthChange = await wilds.calculateDefenderDamage(1);
				let lcp = await wilds.calculateLCP(landId, 1);
				expect(lcp).to.be.within(day - 1000, day + 1000);
				await wilds.unstake(1);
				let meral = await merals.getEthemeral(1);
				expect(meral.score).to.be.within(1000 - parseInt(healthChange) - 1, 1000 - parseInt(healthChange) + 1);
			});

			describe('GO RAIDING!', function () {
				it('Should allow death kiss defenders and swap to defenders', async function () {
					let landId = 1;

					for (let i = 1; i <= 5; i++) {
						await merals.changeScore(i, 1000, true, 0);
						await wilds.stake(landId, i, 1);

						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
					}

					for (let i = 11; i <= 15; i++) {
						await merals.changeScore(i, 1000, true, 0);
						await wilds.connect(player1).stake(landId, i, 4);

						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
					}

					await network.provider.send('evm_increaseTime', [day * 2]);
					await network.provider.send('evm_mine');

					let remainingHealth = await wilds.calculateDefenderDamage(1);

					while (remainingHealth > 1) {
						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
						let value = await wilds.calculateDefenderDamage(1);
						remainingHealth = 1000 - value;

						if (remainingHealth < 50) {
							console.log(remainingHealth);
							await expect(wilds.connect(player1).deathKiss(1, 1)).to.be.revertedWith('need success');
							await expect(wilds.connect(player2).deathKiss(25, 21)).to.be.revertedWith('need success');
							await wilds.connect(player1).deathKiss(1, 11);
							let defenderSlots = await wilds.getSlots(1, 1);

							expect(defenderSlots.length).to.equal(4);
							let defender = await merals.getEthemeral(1);
							expect(remainingHealth).to.equal(defender.score);
							break;
						}
					}

					await expect(wilds.stake(landId, 1, 1)).to.be.revertedWith('no reinforcements');

					remainingHealth = await wilds.calculateDefenderDamage(2);
					while (remainingHealth > 1) {
						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
						let value = await wilds.calculateDefenderDamage(2);
						remainingHealth = 1000 - value;

						if (remainingHealth < 25) {
							console.log(remainingHealth);
							await wilds.connect(player2).deathKiss(2, 21);
							let defenderSlots = await wilds.getSlots(1, 1);
							expect(defenderSlots.length).to.equal(3);
							let defender = await merals.getEthemeral(2);
							expect(remainingHealth).to.equal(defender.score);
							break;
						}
					}

					await network.provider.send('evm_increaseTime', [day]);
					await network.provider.send('evm_mine');

					// SWAP DEFENDERS
					await wilds.connect(player2).deathKiss(3, 21);
					await wilds.connect(player2).deathKiss(4, 21);
					let defenderSlots = await wilds.getSlots(1, 1);
					expect(defenderSlots.length).to.equal(1);
					let attackerSlots = await wilds.getSlots(1, 4);
					expect(attackerSlots.length).to.equal(5);
					// last defender
					await wilds.connect(player2).deathKiss(5, 21);
					attackerSlots = await wilds.getSlots(1, 4);
					expect(attackerSlots.length).to.equal(0);
					defenderSlots = await wilds.getSlots(1, 1);
					expect(defenderSlots.length).to.equal(5);

					for (let i = 1; i <= 5; i++) {
						let value = await wilds.getStake(i);
						expect(value.stakeAction).to.equal(0);
						expect(await merals.ownerOf(i)).to.equal(admin.address);
					}

					for (let i = 11; i <= 15; i++) {
						let value = await wilds.getStake(i);
						expect(value.stakeAction).to.equal(1);
					}

					await network.provider.send('evm_increaseTime', [day * 3]);
					await network.provider.send('evm_mine');

					for (let i = 11; i <= 15; i++) {
						let value = await wilds.calculateLCP(1, i);
						console.log(value.toString());
						value = await wilds.calculateDefenderDamage(i);
						console.log(value.toString());
					}
				});

				it('Should allow new defenders to swap with another token', async function () {
					let landId = 1;

					for (let i = 1; i <= 5; i++) {
						await merals.changeScore(i, 1000, true, 0);
						await wilds.stake(landId, i, 1);

						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
					}

					for (let i = 11; i <= 15; i++) {
						await merals.changeScore(i, 1000, true, 0);
						await wilds.connect(player1).stake(landId, i, 4);

						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
					}

					await network.provider.send('evm_increaseTime', [day * 10]);
					await network.provider.send('evm_mine');

					for (let i = 1; i <= 5; i++) {
						await wilds.connect(player1).deathKiss(i, 21);
					}

					await network.provider.send('evm_increaseTime', [hour]);
					await network.provider.send('evm_mine');

					await expect(wilds.connect(admin).swapDefenders(11, 5)).to.be.revertedWith('need success');

					for (let i = 11; i <= 12; i++) {
						await wilds.connect(player1).swapDefenders(i, i + 5);

						expect(await merals.ownerOf(i)).to.equal(player1.address);
						expect(await merals.ownerOf(i + 5)).to.equal(wilds.address);
						value = await wilds.getStake(i);
						expect(value.stakeAction).to.equal(0);
						value = await wilds.getStake(i + 5);
						expect(value.stakeAction).to.equal(1);
					}

					await network.provider.send('evm_increaseTime', [day]);
					await network.provider.send('evm_mine');
					await expect(wilds.connect(player1).swapDefenders(15, 20)).to.be.revertedWith('need success');
				});

				it('Should not allow raidActions', async function () {
					await makeRaid();
					let landId = 1;

					// LAND2
					for (let i = 6; i <= 10; i++) {
						await wilds.stake(landId + 1, i, 1);
						await network.provider.send('evm_increaseTime', [hour]);
						await network.provider.send('evm_mine');
					}

					await expect(wilds.raidAction(11, 12, 1)).to.be.revertedWith('need success');
					await expect(wilds.raidAction(1, 12, 1)).to.be.revertedWith('need success');
					await expect(wilds.connect(player1).raidAction(6, 15, 1)).to.be.revertedWith('need success');

					await wilds.raidAction(1, 1, 1);
				});

				it('Should allow attack raidActions', async function () {
					await makeRaid();

					// single attack
					let raidAction = 0;
					let defender = 2;
					let attacker = 11;
					let damage = 0;
					let count = 0;

					while (damage < 1000) {
						count++;
						let preAttacker = await wilds.getStake(attacker);
						let stamina = await wilds.calculateStamina(attacker);
						console.log('calcStamina', stamina);
						if (stamina < 100 - 30) {
							let preStake = await wilds.getStake(defender);
							await wilds.connect(player1).raidAction(defender, attacker, raidAction);
							let postStake = await wilds.getStake(defender);
							let postAttacker = await wilds.getStake(attacker);
							expect(preStake.damage).to.be.lt(postStake.damage);

							console.log('stake.damage', postStake.damage);
							console.log('stamina', postAttacker.stamina);
							damage = await wilds.calculateDefenderDamage(defender);
							console.log('calculate damage', damage.toString());
						}
						await network.provider.send('evm_increaseTime', [hour * 4]);
						await network.provider.send('evm_mine');
					}

					console.log(count, 'count');
				});

				it('Should allow attack and set stamina', async function () {
					await makeRaid();
					//attack all
					let raidAction = 0;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 2;
					let attacker = 11;

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					let value = await wilds.getStake(1);
					expect(value.damage).to.equal(0);

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(staminaCost);

					await wilds.setStaminas([10, 10]);
					let staminaCost2 = await wilds.staminaCosts(raidAction);
					expect(staminaCost2).to.equal(10);

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(staminaCost + staminaCost2);
				});

				it('Should allow attackAll raidActions', async function () {
					await makeRaid();
					//attack all
					let raidAction = 1;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 2;
					let attacker = 11;

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					for (let i = 1; i <= 5; i++) {
						let value = await wilds.getStake(i);
						expect(value.damage).to.equal(0);
					}

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(staminaCost);

					for (let i = 1; i <= 5; i++) {
						let value = await wilds.getStake(i);
						expect(value.damage).to.be.gt(0);
						console.log(value.damage);
					}

					await expect(wilds.connect(player1).raidAction(defender, attacker, raidAction)).to.be.revertedWith('need success');
				});

				it('Should calculate damage in raidActions', async function () {
					await makeRaid();

					for (let i = 1; i < 20; i++) {
						let meral = await merals.getEthemeral(i);
						let meral2 = await merals.getEthemeral(i + 10);
						let defDamage = await wilds.calculateDefendedDamage(meral.atk, meral2.def);
						let lightMagic = await wilds.calculateLightMagicDamage(meral.def, meral.spd);
						let darkMagic = await wilds.calculateDarkMagicDamage(meral.atk, meral.def);
						let spdDamage = await wilds.calculateSpdDamage(meral.atk, meral2.def, meral.spd);
						console.log(`${meral.atk} atk, ${meral.def} def, ${meral.spd} spd, ${lightMagic} LM, ${darkMagic} DM, ${spdDamage} SD, ${defDamage} DD`);
					}
				});

				it('Should not allow actions if dead', async function () {
					await makeRaid();
					await network.provider.send('evm_increaseTime', [day * 4]);
					await network.provider.send('evm_mine');

					let value = await wilds.calculateDefenderDamage(1);
					console.log(value);
					await expect(wilds.raidAction(1, 1, 7)).to.be.revertedWith('need success');
				});

				it('Should heal in raidActions', async function () {
					await makeRaid();
					//attack all

					let attackAllAction = 1;
					let healAction = 2;
					let staminaCost = await wilds.staminaCosts(healAction);
					let defender = 1;
					let attacker = 11;
					let healer = 5;

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);

					let preHealDamage = await wilds.calculateDefenderDamage(defender);
					console.log(preHealDamage);

					let preHealStamina = await wilds.getStake(2);
					expect(preHealStamina.stamina).to.equal(0);
					await wilds.raidAction(defender, healer, healAction);
					let postHealDamage = await wilds.calculateDefenderDamage(defender);

					expect(parseInt(preHealDamage)).to.be.gt(parseInt(postHealDamage));

					let postHealStamina = await wilds.getStake(healer);
					expect(postHealStamina.stamina).to.equal(staminaCost);
				});

				it('Should heal all in raidActions', async function () {
					await makeRaid();
					//attack all

					let attackAllAction = 1;
					let healAction = 3;
					let staminaCost = await wilds.staminaCosts(healAction);
					let defender = 1;
					let attacker = 11;
					let healer = 1;

					let meral = await merals.getEthemeral(healer);
					console.log(meral.atk, meral.def, meral.spd);

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);
					await wilds.connect(player1).raidAction(defender, attacker, 0);

					let preHealStamina = await wilds.getStake(2);
					expect(preHealStamina.stamina).to.equal(0);

					for (let i = 1; i <= 5; i++) {
						let preHealDamage = await wilds.calculateDefenderDamage(i);
						console.log(preHealDamage);
					}

					await wilds.raidAction(defender, healer, healAction);

					for (let i = 1; i <= 5; i++) {
						let postHealDamage = await wilds.calculateDefenderDamage(i);
						console.log(postHealDamage);
					}

					let postHealStamina = await wilds.getStake(healer);
					expect(postHealStamina.stamina).to.equal(staminaCost);
				});

				it('Should allow magic attack', async function () {
					await makeRaid();
					//attack all
					let raidAction = 4;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 5;
					let attacker = 11;

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					let value = await wilds.getStake(1);
					expect(value.damage).to.equal(0);

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(staminaCost);

					value = await wilds.getStake(defender);
					console.log(value.damage, 'magic attack');
				});

				it('Should allow speed attack', async function () {
					await makeRaid();
					//attack all
					let raidAction = 5;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 5;
					let attacker = 11;

					let attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(0);

					let value = await wilds.getStake(1);
					expect(value.damage).to.equal(0);

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					attackerStake = await wilds.getStake(attacker);
					expect(attackerStake.stamina).to.equal(staminaCost);

					value = await wilds.getStake(defender);
					console.log(value.damage, 'speed attack');
				});

				it('Should allow concentration action', async function () {
					await makeRaid();
					//attack all
					let raidAction = 7;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 5;
					let attacker = 11;

					let defenderStake = await wilds.getStake(defender);
					expect(defenderStake.stamina).to.equal(0);

					let preLand = await wilds.landPlots(1);
					console.log(preLand.baseDefence, 'baseDefence');

					await wilds.raidAction(defender, defender, raidAction);
					defenderStake = await wilds.getStake(defender);
					expect(defenderStake.stamina).to.equal(staminaCost);

					let postLand = await wilds.landPlots(1);
					console.log(postLand.baseDefence, 'baseDefence');
					expect(postLand.baseDefence).to.be.gt(preLand.baseDefence);
				});

				it('Should allow enrage action', async function () {
					await makeRaid();
					//attack all
					let raidAction = 6;
					let staminaCost = await wilds.staminaCosts(raidAction);
					let defender = 5;
					let attacker = 11;

					let stake = await wilds.getStake(attacker);
					expect(stake.stamina).to.equal(0);

					let preLand = await wilds.landPlots(1);
					console.log(preLand.baseDefence, 'baseDefence');

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					stake = await wilds.getStake(attacker);
					expect(stake.stamina).to.equal(staminaCost);

					let postLand = await wilds.landPlots(1);
					console.log(postLand.baseDefence, 'baseDefence');
					expect(postLand.baseDefence).to.be.lt(preLand.baseDefence);
				});

				it('Should upgrade Actions to V2', async function () {
					await makeRaid();

					let raidAction = 0;
					let defender = 5;
					let attacker = 11;

					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					let damage = await wilds.calculateDefenderDamage(defender);
					console.log(damage);

					const WildsActionsV2 = await ethers.getContractFactory('WildsActionsV2');
					wildsActionsV2 = await WildsActionsV2.deploy();
					await wildsActionsV2.deployed();

					await wilds.setAddresses(wildsStaking.address, wildsActionsV2.address);

					await wilds.raidAction(defender, 2, raidAction);
					let damage2 = await wilds.calculateDefenderDamage(defender);
					expect(damage2).to.be.lt(damage);
				});
			});
		});
	});
});
