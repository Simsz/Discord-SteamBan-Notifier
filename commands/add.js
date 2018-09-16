const Discord = require('discord.js');
const request = require('request');

exports.run = async (client, msg, args) => {
	if (!args[0]) {
		msg.channel.send({embed: {
			title: 'Error',
			description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
		return;
	}

	var m = await msg.channel.send({embed: {
		title: 'Please wait...',
		color: Discord.Util.resolveColor('#ff8000')
	}}).catch(() => {});
	if (!m) return;

	client.steamParse64ID(args[0]).then((steamid) => {
		client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
		request('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, (err, res, body) => {
			if (err) {
				m.edit({embed: {
					title: 'Error',
					description: 'Failed to contact Steam API',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
				console.error(err);
				return;
			}

			var banJson = undefined;
			try {
				banJson = JSON.parse(body);
			} catch(e) {};

			if (!banJson) {
				m.edit({embed: {
					title: 'Error',
					description: 'Malformed Steam API response',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
				console.log(body);
				return;
			}

			if (!banJson.players || banJson.players.length < 1) {
				m.edit({embed: {
					title: 'Error',
					description: 'Malformed Steam API response',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
				console.log(banJson);
				return;
			}

			client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
			request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, async (err, res, body) => {
				if (err) {
					m.edit({embed: {
						title: 'Error',
						description: 'Failed to contact Steam API',
						color: Discord.Util.resolveColor('#ff0000')
					}}).catch(() => {});
					console.error(err);
					return;
				}

				var profileJson = undefined;
				try {
					profileJson = JSON.parse(body);
				} catch(e) {};

				if (!profileJson) {
					m.edit({embed: {
						title: 'Error',
						description: 'Malformed Steam API response',
						color: Discord.Util.resolveColor('#ff0000')
					}}).catch(() => {});
					console.log(body);
					return;
				}

				if (!profileJson.response) {
					m.edit({embed: {
						title: 'Error',
						description: 'Malformed Steam API response',
						color: Discord.Util.resolveColor('#ff0000')
					}}).catch(() => {});
					console.log(profileJson);
					return;
				}

				if (!profileJson.response.players || profileJson.response.players.length < 1) {
					m.edit({embed: {
						title: 'Error',
						description: 'Malformed Steam API response',
						color: Discord.Util.resolveColor('#ff0000')
					}}).catch(() => {});
					console.log(profileJson);
					return;
				}

				await client.accounts.fetch(profileJson.response.players[0].steamid);

				if (client.accounts.get(profileJson.response.players[0].steamid)) {
					var data = client.accounts.get(profileJson.response.players[0].steamid);

					if (data.channels.includes(msg.channel.id)) {
						m.edit({embed: {
							title: 'Error',
							description: '`' + Discord.Util.escapeMarkdown(profileJson.response.players[0].personaname) + '` is already being watched',
							color: Discord.Util.resolveColor('#ff0000')
						}}).catch(() => {});
						return;
					}

					data.channels.push(msg.channel.id);
					data.lastSavedName = profileJson.response.players[0].personaname;
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
				}

				client.accounts.set(profileJson.response.players[0].steamid, data);

				m.edit({embed: {
					title: 'Success',
					description: 'Added `' + Discord.Util.escapeMarkdown(profileJson.response.players[0].personaname) + '` to the watchlist',
					color: Discord.Util.resolveColor('#00ff00')
				}}).catch(() => {});
			});
		});
	}).catch((err) => {
		if (typeof err === 'string') {
			if (err === 'Malformed Steam API Response') {
				m.edit({embed: {
					title: 'Error',
					description: 'Malformed Steam API Response',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
			} else if (err === 'No match') {
				m.edit({embed: {
					title: 'Error',
					description: 'Could not get SteamID64',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
			} else {
				console.log(err);
				m.edit({embed: {
					title: 'Error',
					description: 'Unknown Steam Response',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
			}
		} else {
			console.error(err);
			m.edit({embed: {
				title: 'Error',
				description: 'Unknown Steam Response',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
		}
	});
};

exports.help = {
	name: 'add',
	description: 'Add a user to the watchlist',
	usage: 'add <SteamID64/ProfileLink>'
};
