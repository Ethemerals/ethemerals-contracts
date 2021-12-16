const { tokens } = require('./first1000');

const Merals = () => {
	let merals = [];
	tokens.forEach((token, index) => {
		let atk = token.atk;
		let def = token.def;
		let spd = token.spd;
		let score = 300;
		let rewards = 2000;
		merals.push({ score, rewards, atk, def, spd });
	});

	return merals;
};

function minMaxAvg(arr) {
	var max = arr[0];
	var min = arr[0];
	var sum = arr[0];
	for (var i = 1; i < arr.length; i++) {
		if (arr[i] > max) {
			max = arr[i];
		}
		if (arr[i] < min) {
			min = arr[i];
		}
		sum = sum + arr[i];
	}
	return [min, max, sum / arr.length];
}

module.exports = { Merals, minMaxAvg };
