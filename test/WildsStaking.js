const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt, getTypeFromId, getIdFromType } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds Staking', function () {
	let merals;
	let escrowL1;
	let meralManager;
	let wilds;
	let onsen;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];
	let allMeralStats = MeralsL1Data();

	const getOGMeralId = async (tokenId) => {
		let type = 1;
		let id = await meralManager.getIdFromType(type, tokenId);
		return id;
	};

	const makeRaid = async () => {
		const landId = 1;
		for (let i = 1; i <= 5; i++) {
			let id = await getOGMeralId(i);
			await meralManager.changeHP(id, 1000, true);
			await wilds.stake(landId, id, 1);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}

		for (let i = 11; i <= 15; i++) {
			let id = getOGMeralId(i);
			await wilds.connect(player1).stake(landId, id, 4);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}
	};

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		// L1 Contracts
		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
		await merals.deployed();

		// L2 Contracts
		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy();
		await meralManager.deployed();

		// L2 Wilds Contracts
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

		wilds = await Wilds.deploy(meralManager.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
		await wilds.deployed();

		const Onsen = await ethers.getContractFactory('Onsen');
		onsen = await Onsen.deploy(meralManager.address);
		await onsen.deployed();

		// L1 mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await network.provider.send('evm_increaseTime', [day]);
		await network.provider.send('evm_mine');

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// add admin as delegate and game master
		await meralManager.addGM(admin.address, true);
		await meralManager.addValidators(admin.address, true);
		// register ethemeral contract address
		await meralManager.registerContract(merals.address);

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);

		// REGISTER MERALS
		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			if (i <= 10) {
				await meralManager.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 10 && i <= 20) {
				await meralManager
					.connect(player1)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 20 && i <= 30) {
				await meralManager
					.connect(player2)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 30) {
				await meralManager
					.connect(player3)
					.registerMeral(merals.address, i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			}
		}

		// MINT MERALS
		for (let i = 1; i <= 40; i++) {
			await meralManager.mintMeral(getIdFromType(1, i));
		}
	});

	describe('STAKING AND UNSTAKING', function () {
		it('Should try to stake and unstake but revert', async function () {
			let id = getOGMeralId(11);
			await expect(wilds.stake(1, id, 1)).to.be.revertedWith('owner only');

			id = getOGMeralId(5);
			await wilds.stake(1, id, 1);
			await expect(wilds.stake(1, id, 1)).to.be.revertedWith('owner only');

			id = getOGMeralId(6);
			await expect(wilds.stake(7, id, 1)).to.be.revertedWith('not land');

			await expect(wilds.stake(2, id, 2)).to.be.revertedWith('need defender');
			await expect(wilds.stake(2, id, 4)).to.be.revertedWith('not raidable');

			id = getOGMeralId(11);
			await wilds.connect(player1).stake(1, id, 1);
			expect(await meralManager.ownerOf(getIdFromType(1, 11))).to.equal(wilds.address);
			await expect(wilds.connect(player1).unstake(id)).to.be.revertedWith('cooldown');
			await expect(wilds.connect(player2).unstake(id)).to.be.revertedWith('owner only');

			id = getOGMeralId(12);
			await expect(wilds.connect(player1).unstake(id)).to.be.revertedWith('owner only');

			id = getOGMeralId(1);
			await expect(wilds.unstake(id)).to.be.revertedWith('not staked');

			await expect(wilds.addLand(1, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100)).to.be.revertedWith('already land');
			await expect(wilds.connect(player1).addLand(12, 10, 10, [3, 4, 5], [4, 5, 6], 1000, 10, 100)).to.be.revertedWith('admin only');
		});

		it('Should lock defenders in', async function () {
			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await wilds.stake(1, id, 1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			await wilds.stake(1, getOGMeralId(6), 4);
			await expect(wilds.unstake(getOGMeralId(1))).to.be.revertedWith('in a raid');

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
		});

		it('Should stake into land1', async function () {
			await wilds.stake(1, getOGMeralId(10), 1);
			expect(await meralManager.ownerOf(getIdFromType(1, 10))).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.unstake(getOGMeralId(10));
			expect(await meralManager.ownerOf(getIdFromType(1, 10))).to.equal(admin.address);

			await wilds.connect(player1).stake(1, getOGMeralId(11), 1);
			expect(await meralManager.ownerOf(getIdFromType(1, 11))).to.equal(wilds.address);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.connect(player1).unstake(getOGMeralId(11));
			expect(await meralManager.ownerOf(getIdFromType(1, 11))).to.equal(player1.address);

			// admin unstake
			await wilds.connect(player1).stake(1, getOGMeralId(20), 1);
			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.unstake(getOGMeralId(20));
			expect(await meralManager.ownerOf(getIdFromType(1, 20))).to.equal(player1.address);
		});

		it('Should stake into land1 but not more then 5', async function () {
			await wilds.stake(1, getOGMeralId(1), 1);
			await wilds.stake(1, getOGMeralId(2), 1);
			await wilds.stake(1, getOGMeralId(3), 1);
			await wilds.stake(1, getOGMeralId(4), 1);
			await wilds.stake(1, getOGMeralId(5), 1);

			await expect(wilds.stake(1, getOGMeralId(6), 1)).to.be.revertedWith('full');
		});

		it('Should set raid status from 0 to 1 to 2 and to 0', async function () {
			let land = await wilds.landPlots(1);
			await wilds.stake(1, getOGMeralId(1), 1);
			await wilds.stake(1, getOGMeralId(2), 1);
			await wilds.stake(1, getOGMeralId(3), 1);
			await wilds.stake(1, getOGMeralId(4), 1);
			expect(land.raidStatus).to.equal(0);
			await wilds.stake(1, getOGMeralId(5), 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);
			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await wilds.unstake(getOGMeralId(1));
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(0);

			await wilds.stake(1, getOGMeralId(1), 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);

			// different land
			await wilds.stake(2, getOGMeralId(8), 1);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(1);

			await wilds.stake(1, getOGMeralId(6), 4);
			await wilds.stake(1, getOGMeralId(7), 4);
			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(2);

			await network.provider.send('evm_increaseTime', [day * 10]);
			await network.provider.send('evm_mine');

			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(2);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await wilds.deathKiss(id, getOGMeralId(6));
			}

			land = await wilds.landPlots(1);
			expect(land.raidStatus).to.equal(0);
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
					let id = getOGMeralId(i);
					await wilds.stake(landId, id, 1);
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
					let id = getOGMeralId(i);
					await wilds.connect(player1).stake(landId, id, 1);
					land = await wilds.landPlots(landId);
					console.log(land.baseDefence, 'baseDefence');
					expect(baseDefence).to.be.lt(land.baseDefence);
					baseDefence = land.baseDefence;
				}

				land = await wilds.landPlots(landId);
				console.log(land.raidStatus, 'raidStatus');

				for (let i = 1; i <= 5; i++) {
					let id = getOGMeralId(i);
					await wilds.stake(landId, id, 4);
					land = await wilds.landPlots(landId);
					console.log(land.baseDefence, 'baseDefence');
					expect(baseDefence).to.be.gt(land.baseDefence);
					baseDefence = land.baseDefence;
				}
			});

			it('Should stake and unstake and reduce HP', async function () {
				let landId = 1;

				for (let i = 1; i < 11; i++) {
					let id = getOGMeralId(i);
					await meralManager.changeHP(id, 1000, true);
					await wilds.stake(landId, id, 1);

					// await network.provider.send('evm_increaseTime', [hour * 6]);
					// await network.provider.send('evm_mine');

					if (i === 5) {
						landId = 2;
					}
				}

				await network.provider.send('evm_increaseTime', [day * 1]);
				await network.provider.send('evm_mine');

				function shuffle(array) {
					return array.sort(() => Math.random() - 0.5);
				}

				let defId = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
				let atkId = shuffle([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

				for (let i = 0; i < 10; i++) {
					let id = await getOGMeralId(defId[i]);
					let healthChange = await wilds.calculateDamage(id);
					console.log(healthChange.toString(), `token id #${id}`);
					await wilds.unstake(id);
					let meral = await meralManager.getMeralById(id);
					console.log(1000 - meral.hp, meral.def, id);

					expect(meral.hp).to.be.equal(1000 - parseInt(healthChange));
				}

				landId = 1;
				console.log('round 2');

				for (let i = 1; i < 11; i++) {
					let id = await getOGMeralId(i);
					await meralManager.changeHP(id, 1000, true);
					await wilds.stake(landId, id, 1);

					await network.provider.send('evm_increaseTime', [hour * 6]);
					await network.provider.send('evm_mine');

					if (i === 5) {
						landId = 2;
					}
				}

				await network.provider.send('evm_increaseTime', [day * 2]);
				await network.provider.send('evm_mine');

				for (let i = 0; i < 10; i++) {
					let id = await getOGMeralId(defId[i]);
					let healthChange = await wilds.calculateDamage(id);

					console.log(healthChange.toString(), `token id #${id}`);
					await wilds.unstake(id);
					let meral = await meralManager.getMeralById(id);
					console.log(1000 - meral.hp, meral.def, id);

					expect(meral.hp).to.be.equal(1000 - parseInt(healthChange));
				}
			});

			it('Should stake and unstake single', async function () {
				let landId = 1;
				let id = getOGMeralId(1);

				await meralManager.changeHP(id, 1000, true);
				await wilds.stake(landId, id, 1);

				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');

				let healthChange = await wilds.calculateDamage(id);
				let lcp = await wilds.getLCP(landId, id);
				expect(lcp).to.be.within(day - 1000, day + 1000);
				await wilds.unstake(id);
				let meral = await meralManager.getMeralById(id);
				expect(meral.hp).to.be.within(1000 - parseInt(healthChange) - 1, 1000 - parseInt(healthChange) + 1);
			});
		});
	});
});
