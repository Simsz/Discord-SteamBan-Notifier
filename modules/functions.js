const request = require('request');
const fs = require('fs');
const util = require('util');
const Discord = require('discord.js');

module.exports = (client) => {
	client.clean = (text) => {
		if (typeof text !== 'string')
			text = util.inspect(text, {depth: 0})
		text = text
			.replace(/`/g, '`' + String.fromCharCode(8203))
			.replace(/@/g, '@' + String.fromCharCode(8203))
			.replace(client.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0');
		return text;
	};

	client.chunkArray = (myArray, chunk_size) => {
		var index = 0;
		var arrayLength = myArray.length;
		var tempArray = [];

		for (index = 0; index < arrayLength; index += chunk_size) {
			myChunk = myArray.slice(index, index+chunk_size);
			tempArray.push(myChunk);
		}

		return tempArray;
	};

	client.steamParse64ID = (text) => {
		return new Promise((resolve, reject) => {
			var check = text;
			check = check.replace('http://www.steamcommunity.com/profiles/', '');
			check = check.replace('http://steamcommunity.com/profiles/', '');
			check = check.replace('https://www.steamcommunity.com/profiles/', '');
			check = check.replace('https://steamcommunity.com/profiles/', '');
			check = check.replace('http://www.steamcommunity.com/profiles/', '');
			check = check.replace('steamcommunity.com/profiles/', '');
			check = check.replace(/\//g, '');

			if (/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/.test(check)) {
				resolve(check);
				return;
			}

			check = text;
			check = check.replace('http://www.steamcommunity.com/id/', '');
			check = check.replace('http://steamcommunity.com/id/', '');
			check = check.replace('https://www.steamcommunity.com/id/', '');
			check = check.replace('https://steamcommunity.com/id/', '');
			check = check.replace('http://www.steamcommunity.com/id/', '');
			check = check.replace('steamcommunity.com/id/', '');
			check = check.replace(/\//g, '');

			client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
			request('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&vanityurl=' + check + '&url_type=1', (err, res, body) => {
				if (err) {
					reject(err);
					return;
				}

				var json = undefined;
				try {
					json = JSON.parse(body);
				} catch(e) {};

				if (!json) {
					console.log(body);
					reject('Malformed Steam API Response');
					return;
				}
				
				if (!json.response) {
					console.log(json);
					reject('Malformed Steam API Response');
					return;
				}

				if (json.response.success === 42) {
					reject('No match');
					return;
				}

				if (!json.response.steamid) {
					console.log(json);
					reject('Malformed Steam API Response');
					return;
				}

				resolve(json.response.steamid);
			});
		});
	};

	client.steamAPIkeyCheck = () => {
		client.steamAPI.curUses++;

		if (client.steamAPI.curUses >= client.config.switchKeyAt) {
			client.steamAPI.curUses = 0;
			client.steamAPI.currentlyUsedID++;
			if (client.steamAPI.currentlyUsedID >= client.steamAPI.keys.length) client.steamAPI.currentlyUsedID = 0;
		}

		fs.writeFileSync('./apiKeys.json', JSON.stringify(client.steamAPI, null, 4)); // Backup save it incase of a bot-crash
	};

	process.on('uncaughtException', (err) => console.error(err));
	process.on('unhandledRejection', (err) => console.error(err));

	(() => {
		var og = console.log;
		console.log = (n, ownerOnly = false) => {
			og(n);

			if (!client.config.logs || client.config.logs.length < 1 || client.status !== 0) return;

			const embed = new Discord.MessageEmbed();
			embed.setTimestamp();
			embed.setTitle('Console log');
			if (typeof n === 'object') n = 'JSON\n' + JSON.stringify(n, null, 4);

			var text = '```' + n;
			embed.setDescription(text.substring(0, 2024) + '```');
			embed.setColor('#63e10f');

			if (ownerOnly === true) {
				if (client.users.get(client.config.owner)) client.users.get(client.config.owner).send({embed: embed});
			} else {
				if (client.channels.get(client.config.logs)) client.channels.get(client.config.logs).send({embed: embed});
			}
		}
	})();

	(() => {
		var og = console.error;
		console.error = (n) => {
			og(n);

			if (!client.config.logs || client.config.logs.length < 1 || client.status !== 0) return;

			const embed = new Discord.MessageEmbed();
			embed.setTimestamp();
			embed.setTitle('Console log');
			if (typeof n === 'object') n = 'JSON\n' + JSON.stringify(n, null, 4);

			var text = '<@' + client.config.owner + '>\n```' + n;
			embed.setDescription(text.substring(0, 2024) + '```');
			embed.setColor('#b90000');
			if (client.channels.get(client.config.logs)) client.channels.get(client.config.logs).send({embed: embed});
		}
	})();

	(() => {
		var og = console.warn;
		console.warn = (n) => {
			og(n);

			if (!client.config.logs || client.config.logs.length < 1 || client.status !== 0) return;

			const embed = new Discord.MessageEmbed();
			embed.setTimestamp();
			embed.setTitle('Console log');
			if (typeof n === 'object') n = 'JSON\n' + JSON.stringify(n, null, 4);

			var text = '```' + n;
			embed.setDescription(text.substring(0, 2024) + '```');
			embed.setColor('#f27300');
			if (client.channels.get(client.config.logs)) client.channels.get(client.config.logs).send({embed: embed});
		}
	})();
};
