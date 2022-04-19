const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt, getIdFromType } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('EternalBattle', function () {
	let merals;
	let escrowL1;
	let meralManager;
	let battle;
	let priceFeedProvider;
	let aggregatorV3Mock;
	let wilds;
	let onsen;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];
	let allMeralStats = MeralsL1Data();

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

		// L2 Eternal Battle Contracts
		const PriceFeedProvider = await ethers.getContractFactory('PriceFeedProvider');
		priceFeedProvider = await PriceFeedProvider.deploy();
		await priceFeedProvider.deployed();

		const EternalBattle = await ethers.getContractFactory('EternalBattle');
		battle = await EternalBattle.deploy(meralManager.address, priceFeedProvider.address);
		await battle.deployed();
		await battle.resetGamePair(1, true);
		await battle.resetGamePair(2, true);

		let decimals = 8;
		let intialAnswer = 1;

		const AggregatorV3Mock = await ethers.getContractFactory('AggregatorV3Mock');
		aggregatorV3Mock = await AggregatorV3Mock.deploy(decimals, intialAnswer);
		await aggregatorV3Mock.deployed();

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
		await meralManager.addValidators(admin.address, true);
		await meralManager.addGM(admin.address, true);
		await meralManager.addGM(battle.address, true);
		// register ethemeral contract address
		await meralManager.registerContract(merals.address);

		// REGISTER MERALS
		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			if (i <= 10) {
				await meralManager.registerMeral(
					merals.address,
					i,
					meralStats.cmId,
					meralStats.rewards,
					meralStats.score,
					meralStats.atk,
					meralStats.def,
					meralStats.spd,
					meralStats.element,
					meralStats.subclass
				);
			} else if (i > 10 && i <= 20) {
				await meralManager
					.connect(player1)
					.registerMeral(merals.address, i, meralStats.cmId, meralStats.rewards, meralStats.score, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 20 && i <= 30) {
				await meralManager
					.connect(player2)
					.registerMeral(merals.address, i, meralStats.cmId, meralStats.rewards, meralStats.score, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			} else if (i > 30) {
				await meralManager
					.connect(player3)
					.registerMeral(merals.address, i, meralStats.cmId, meralStats.rewards, meralStats.score, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			}
		}

		// MINT MERALS
		for (let i = 1; i <= 40; i++) {
			await meralManager.mintMeral(getIdFromType(1, i));
		}
	});

	describe('Eternal Battle', function () {
		it('should update price mock', async () => {
			let feedId = 1;
			await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);

			let mockPriceAnswer1 = 828935030000000;

			await aggregatorV3Mock.updateAnswer(mockPriceAnswer1);
			latestPrice = await priceFeedProvider.getLatestPrice(feedId);
			expect(latestPrice.toNumber()).to.equal(mockPriceAnswer1);

			let mockPriceAnswer2 = 911735030000000;
			await aggregatorV3Mock.updateAnswer(mockPriceAnswer2);
			latestPrice = await priceFeedProvider.getLatestPrice(feedId);
			expect(latestPrice.toNumber()).to.equal(mockPriceAnswer2);
		});

		it('assign bonus to CMIds', async () => {
			let cmIds = [1, 825];
			await battle.setCMIDBonus(cmIds, 1, false, true);

			let value = await battle.getShouldBonus(1, 1, false);
			expect(value).to.equal(true);
			value = await battle.getShouldBonus(177, 1, true);
			expect(value).to.equal(false);
			value = await battle.getShouldBonus(177, 1, false);
			expect(value).to.equal(false);

			await priceFeedProvider.upsertFeed(1, aggregatorV3Mock.address);
			let mockPrice1 = 6225287000000;
			await aggregatorV3Mock.updateAnswer(mockPrice1);

			let id = getIdFromType(1, 10);
			let meral = await meralManager.getMeralById(id);
			console.log(meral.cmId, meral.hp, meral.elf);

			await battle.createStake(id, 1, 100, true);
			mockPrice1 = parseInt(mockPrice1 * 1.1);
			await aggregatorV3Mock.updateAnswer(mockPrice1);
			await battle.cancelStake(id);

			meral = await meralManager.getMeralById(id);
			console.log(meral.cmId, meral.hp, meral.elf);

			// SET BONUS
			await battle.setCMIDBonus([meral.cmId], 1, true, true);
			await battle.createStake(id, 1, 100, true);
			mockPrice1 = parseInt(mockPrice1 * 1.1);
			await aggregatorV3Mock.updateAnswer(mockPrice1);
			await battle.cancelStake(id);

			meral = await meralManager.getMeralById(id);
			console.log(meral.cmId, meral.hp, meral.elf, meral.atk, meral.def, meral.spd);
		});

		it('should run for a long time on two price feeds', async () => {
			await priceFeedProvider.upsertFeed(1, aggregatorV3Mock.address);

			const AggregatorV3Mock2 = await ethers.getContractFactory('AggregatorV3Mock');
			let aggregatorV3Mock2 = await AggregatorV3Mock2.deploy(18, 2);
			await aggregatorV3Mock2.deployed();
			await priceFeedProvider.upsertFeed(2, aggregatorV3Mock2.address);

			////
			let mockPrice1 = 6225287000000;
			let mockPrice2 = 925732581101064;

			await aggregatorV3Mock.updateAnswer(mockPrice1);
			await aggregatorV3Mock2.updateAnswer(mockPrice2);

			let run = 0;

			function getRandomInt(max) {
				return Math.floor(Math.random() * max);
			}

			while (run <= 25) {
				let stake = getRandomInt(500) + 500;
				let mult1 = Math.random() * 0.05 + 0.975;
				let mult2 = Math.random() * 0.05 + 0.975;
				let price1 = parseInt(mockPrice1 * mult1);
				let price2 = parseInt(mockPrice2 * mult2);
				console.log(mult1, mult2, stake);

				for (let i = 1; i <= 40; i++) {
					let id = getIdFromType(1, i);
					let long = true;
					if (getRandomInt(2) === 0) {
						long = true;
					} else {
						long = false;
					}

					if (i <= 10) {
						await battle.createStake(id, getRandomInt(2) + 1, stake, long);
					} else if (i > 10 && i <= 20) {
						await battle.connect(player1).createStake(id, getRandomInt(2) + 1, stake, long);
					} else if (i > 20 && i <= 30) {
						await battle.connect(player2).createStake(id, getRandomInt(2) + 1, stake, long);
					} else if (i > 30) {
						await battle.connect(player3).createStake(id, getRandomInt(2) + 1, stake, long);
					}
				}

				await aggregatorV3Mock.updateAnswer(price1);
				await aggregatorV3Mock2.updateAnswer(price2);

				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');

				gamePair = await battle.getGamePair(1);
				console.log('game1', gamePair.toString());
				gamePair = await battle.getGamePair(2);
				console.log('game2', gamePair.toString());
				console.log('UNSTAKE');

				for (let i = 1; i <= 40; i++) {
					let id = getIdFromType(1, i);
					if (i <= 10) {
						await battle.cancelStake(id);
					} else if (i > 10 && i <= 20) {
						await battle.connect(player1).cancelStake(id);
					} else if (i > 20 && i <= 30) {
						await battle.connect(player2).cancelStake(id);
					} else if (i > 30) {
						await battle.connect(player3).cancelStake(id);
					}

					meral = await meralManager.getMeralById(id);
					console.log(`token_${id}`, meral.hp.toString(), meral.elf.toString(), meral.xp.toString());
				}

				console.log('run', run, 'stake', stake);

				// RESET
				mockPrice1 = 32 * 1000000;
				mockPrice2 = 64 * 1000000;
				await aggregatorV3Mock.updateAnswer(mockPrice1);
				await aggregatorV3Mock2.updateAnswer(mockPrice2);

				run++;
				// await time.increase(30);
			}
		});

		it('should revert revive function', async function () {
			let mockPrice = 32 * 1000000;
			let token11 = getIdFromType(1, 11);
			let token10 = getIdFromType(1, 10);
			let token1 = getIdFromType(1, 1);

			await priceFeedProvider.upsertFeed(1, aggregatorV3Mock.address);
			await aggregatorV3Mock.updateAnswer(mockPrice);
			await battle.connect(player1).createStake(token11, 1, 101, true);

			await expect(battle.reviveToken(token11, token10 + 20)).to.be.revertedWith('only owner');
			await expect(battle.reviveToken(token11 + 1, token10)).to.be.revertedWith('only staked');

			await aggregatorV3Mock.updateAnswer(mockPrice * 0.8);
			await expect(battle.reviveToken(token11, token10)).to.be.revertedWith('not dead');
			await aggregatorV3Mock.updateAnswer(mockPrice * 0.1);

			await meralManager.changeELF(token10, 1950, false);
			await expect(battle.createStake(token10, 1, 101, true)).to.be.revertedWith('needs ELF');

			await meralManager.changeELF(token10, 1950, true);

			meral1 = await meralManager.getMeralById(token11);
			meral2 = await meralManager.getMeralById(token1);

			let m1v1 = parseInt(meral1.elf.toString());
			let m2v1 = parseInt(meral2.elf.toString());
			console.log(m1v1, m2v1);

			await battle.reviveToken(token11, token1);
			meral1 = await meralManager.getMeralById(token11);
			meral2 = await meralManager.getMeralById(token1);

			let m1v2 = parseInt(meral1.elf.toString());
			let m2v2 = parseInt(meral2.elf.toString());

			expect(m2v2).to.be.greaterThan(m2v1);
			expect(m1v1).to.be.greaterThan(m1v2);

			value = await meralManager.ownerOf(token11);
			expect(value).to.equal(player1.address);

			await battle.connect(player1).createStake(token11 + 1, 1, 101, true);
			await battle.cancelStakeAdmin(token11 + 1);
			value = await meralManager.ownerOf(token11 + 1);
			expect(value).to.equal(player1.address);
		});

		it('should reset and get Game pair', async () => {
			await battle.resetGamePair(1, true);
			value = await battle.getGamePair(1);
			console.log(value.toString());
			await battle.resetGamePair(1, false);
			await expect(battle.createStake(getIdFromType(1, 10), 1, 255, true)).to.be.revertedWith('not active');
		});
	});
});
