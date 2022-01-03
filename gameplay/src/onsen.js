const { Merals, minMaxAvg, getRandomInt } = require('../utils');

const merals = Merals();

let stakeLength = 604800; // 7 days
// let stakeLength = 86400; // 1 day
// let stakeLength = 3600; // 1 hour
// let stakeLength = 60; // 1 min
// let damage = 0;

function safeScale(number, inMax, outMin, outMax) {
	let scaled = (number * (outMax - outMin)) / inMax + outMin;
	return scaled > outMax ? outMax : scaled;
}

// function calculateScoreChange(start, end, uint16 def, uint16 baseDefence) public pure returns (uint256) {
//   uint256 change = end - start;
//   uint256 scaledDefence = safeScale(def, 1600, 50, 150);
//   return (change * 1000) / scaledDefence / baseDefence;
// }

const scaledStatMinMax = () => {
	const scaledStat = [];
	const stat = [];
	const scoreGain = [];

	merals.forEach((meral) => {
		let change = stakeLength;
		let meralStat = meral.spd * 1;
		const _scaledStat = safeScale(meralStat, 2000, 14, 22);
		change = (change * _scaledStat) / 10000;
		// change = change / 7200;

		scaledStat.push(parseInt(_scaledStat));
		stat.push(parseInt(meralStat));
		scoreGain.push(parseInt(change));
	});

	console.log('stat', minMaxAvg(stat));
	console.log('modifiedStat', minMaxAvg(scaledStat));
	console.log('scoregain', minMaxAvg(scoreGain));
};

scaledStatMinMax();

// let merals = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];

// let monsters = [11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 201];

// let ethems = [11, 12, 13, 14, 15, 16, 17, 18, 19, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 18888];
// let monsters = [21, 22, 23, 24, 25, 26, 27, 28, 29, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 28888];
// let birbs = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 10010, 10011, 10012, 10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020, 1008888];

let type = 25;
typeMult = 100000;
let ethems = [1, 2, 3, 4, 8888];

let ids = [];

// for (let i = 0; i < ethems.length; i++) {
// 	let storedId = ethems[i] + type * typeMult;
// 	console.log(storedId);
// 	console.log(`type: ${type % typeMult}`);
// 	console.log(`type: ${storedId / typeMult}`);
// 	console.log(`id: ${storedId - type * typeMult}`);
// }

const getTypeFromId = (id) => {
	return id / typeMult;
};

const getTokenIdFromId = (_id) => {
	let type = parseInt(getTypeFromId(_id));
	console.log('type', type);
	return _id - type * typeMult;
};

const getIdFromType = (_type, _tokenId) => {
	return _tokenId + _type * typeMult;
};

let id = getIdFromType(5, 100);
// console.log(getIdFromType(5, 777));
console.log(id);
console.log(getTypeFromId(id));
console.log(getTokenIdFromId(id));

// tokenType = _tokenId / 10;
// tokenEdition = _tokenId % 10;
// for (let i = 0; i < ethems.length; i++) {
// console.log(ethems[i] / 10);
// console.log(ethems[i] % 10);
// }
