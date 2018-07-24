const fs = require('fs');
const Discord = require('discord.js');
const request = require('request');

exports.run = async (client, msg, args) => {
	if (!args[0]) {
		msg.channel.send('*Template:* Usage: `' + this.help.usage + '`').catch(() => {});
		return;
	}

	var m = await msg.channel.send('*Template:* Please wait...').catch(() => {});
	if (!m) return;

	client.steamParse64ID(args[0]).then((steamid) => {
		client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
		request('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, (err, res, body) => {
			if (err) {
				m.edit('No response from the Steam API').catch(() => {});
				console.error(err);
				return;
			}

			var banJson = undefined;
			try {
				banJson = JSON.parse(body);
			} catch(e) {};

			if (!banJson) {
				m.edit('Malformed Steam API response').catch(() => {});
				console.log(body);
				return;
			}

			if (!banJson.players || banJson.players.length < 1) {
				m.edit('Malformed Steam API response').catch(() => {});
				console.log(banJson);
				return;
			}

			client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
			request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, (err, res, body) => {
				if (err) {
					m.edit('No response from the Steam API').catch(() => {});
					console.error(err);
					return;
				}

				var profileJson = undefined;
				try {
					profileJson = JSON.parse(body);
				} catch(e) {};

				if (!profileJson) {
					m.edit('Malformed Steam API response').catch(() => {});
					console.log(body);
					return;
				}

				if (!profileJson.response) {
					m.edit('Malformed Steam API response').catch(() => {});
					console.log(profileJson);
					return;
				}

				if (!profileJson.response.players || profileJson.response.players.length < 1) {
					m.edit('Malformed Steam API response').catch(() => {});
					console.log(profileJson);
					return;
				}

				if (fs.existsSync('./data/' + profileJson.response.players[0].steamid + '.json')) {
					var data = JSON.parse(fs.readFileSync('./data/' + profileJson.response.players[0].steamid + '.json'));

					if (data.channels.includes(msg.channel.id)) {
						m.edit('*Template:* `' + Discord.Util.escapeMarkdown(profileJson.response.players[0].personaname) + '` is already being watched').catch(() => {});
						return;
					}

					data.channels.push(msg.channel.id);
					data.lastSavedName = profileJson.response.players[0].personaname;

					fs.writeFileSync('./data/' + profileJson.response.players[0].steamid + '.json', JSON.stringify(data, null, 4));
					m.edit('*Template:* Added `' + Discord.Util.escapeMarkdown(profileJson.response.players[0].personaname) + '` to the watchlist').catch(() => {});
				} else {
					var data = {
						steamID: profileJson.response.players[0].steamid,
						lastSavedName: profileJson.response.players[0].personaname,
						history: {
							vacBans: banJson.players[0].NumberOfVACBans,
							gameBans: banJson.players[0].NumberOfGameBans,
							economyBans: banJson.players[0].EconomyBan,
							communityBan: banJson.players[0].CommunityBanned
						},
						channels: [
							msg.channel.id
						]
					};

					fs.writeFileSync('./data/' + steamid + '.json', JSON.stringify(data, null, 4));
					m.edit('*Template:* Added `' + Discord.Util.escapeMarkdown(profileJson.response.players[0].personaname) + '` to the watchlist').catch(() => {});
				}
			});
		});
	}).catch((err) => {
		if (typeof err === 'string') {
			if (err === 'Malformed Steam API Response') {
				m.edit('*Template:* ' + err).catch(() => {});
			} else if (err === 'No match') {
				m.edit('*Template:* Could not get SteamID64').catch(() => {});
			} else {
				console.log(err);
				m.edit('*Template:* Unknown Steam Response').catch(() => {});
			}
		} else {
			console.error(err);
			m.edit('*Template:* Unknown Steam Response').catch(() => {});
		}
	});
};

exports.help = {
	name: 'add',
	description: 'Add a user to the watch list',
	usage: 'add <SteamID64/ProfileLink>'
};
