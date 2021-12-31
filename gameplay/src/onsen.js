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
