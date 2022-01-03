const { tokens } = require('./subgraphL1/first1000');

const parseClass = (subclass) => {
	let subclassInt = 0;

	if (subclass === 'Paladin') {
		subclassInt = 1;
	}
	if (subclass === 'Knight') {
		subclassInt = 2;
	}
	if (subclass === 'Dark Knight') {
		subclassInt = 3;
	}
	if (subclass === 'Dragoon') {
		subclassInt = 4;
	}

	if (subclass === 'Sorcerer') {
		subclassInt = 5;
	}
	if (subclass === 'Summoner') {
		subclassInt = 6;
	}
	if (subclass === 'Cleric') {
		subclassInt = 7;
	}
	if (subclass === 'Druid') {
		subclassInt = 8;
	}

	if (subclass === 'Ranger') {
		subclassInt = 9;
	}
	if (subclass === 'Berserker') {
		subclassInt = 10;
	}
	if (subclass === 'Assassin') {
		subclassInt = 11;
	}
	if (subclass === 'Monk') {
		subclassInt = 12;
	}

	return subclassInt;
};

const MeralsL1Data = () => {
	let merals = [];
	tokens.forEach((token, index) => {
		let atk = token.atk;
		let def = token.def;
		let spd = token.spd;
		let score = 300;
		let rewards = 2000;
		let element = parseInt(token.bgId);
		let subclass = parseClass(token.subClass);
		merals.push({ score, rewards, atk, def, spd, element, subclass });
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

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}

module.exports = { MeralsL1Data, minMaxAvg, getRandomInt };
