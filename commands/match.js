const Discord = require('discord.js');
const SteamID = require('steamid');
const request = require('request');

exports.run = async (client, msg, args) => {
	await client.premium.fetchEverything();

	if (!client.premium.get(msg.author.id)) {
		msg.channel.send({embed: {
			title: 'Error',
			description: 'You are not a premium user',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
		return;
	}

	var m = await msg.channel.send({embed: {
		title: 'Please wait...',
		color: Discord.Util.resolveColor('#ff8000')
	}}).catch(() => {});
	if (!m) return;

	var accountToUse = client.premium.get(msg.author.id);
	if (client.config.admins.includes(msg.author.id) && args[0]) {
		accountToUse = await client.steamParse64ID(args[0]).catch((err) => {
			if (typeof err === 'string') {
				m.edit({embed: {
					title: 'Error',
					description: err,
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
			} else {
				console.error(err);
				m.edit({embed: {
					title: 'Error',
					description: 'Unknown Steam Response',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
			}
		});
	}

	var sid = new SteamID(accountToUse);
	var reqres = client.csgoUser.match.requestLiveGameForUser(sid.accountid);

	if (reqres !== null) {
		m.edit({embed: {
			title: 'Error',
			description: 'I am not currently connected to the CSGO GameCoordinator. Please try again later.',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
		return;
	}

	async function handleLiveGame(res) {
		if (res.accountid !== sid.accountid) {
			return;
		}
		client.csgoUser.removeListener('liveGameForUser', handleLiveGame);

		if (res.matches.length < 1) {
			m.edit({embed: {
				title: 'Error',
				description: 'User is not in a match',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		if (!res.matches[0].roundstats_legacy || !res.matches[0].roundstats_legacy.reservation || !res.matches[0].roundstats_legacy.reservation.account_ids) {
			m.edit({embed: {
				title: 'Error',
				description: 'Invalid data returned from CSGO Game Coordinator. Please try again.',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		var description = [];
		var reactionsToAdd = [];
		for (let i in res.matches[0].roundstats_legacy.reservation.account_ids) {
			var s = SteamID.fromIndividualAccountID(res.matches[0].roundstats_legacy.reservation.account_ids[i]);
			var prof = await client.getSteamProfile(s.getSteamID64()).catch(() => {});
			if (client.numbers[parseInt(i) + 1]) reactionsToAdd.push(client.numbers[parseInt(i) + 1]);
			if (prof) description.push((client.numbers[parseInt(i) + 1] ? client.numbers[parseInt(i) + 1] : '') + ' [' + Discord.Util.escapeMarkdown(prof.personaname) + ' (' + prof.steamid + ')](https://steamcommunity.com/profiles/' + prof.steamid + ')');
			else description.push((client.numbers[parseInt(i) + 1] ? client.numbers[parseInt(i) + 1] : '') + ' [*Failed to get name* (' + s.getSteamID64() + ')](https://steamcommunity.com/profiles/' + s.getSteamID64() + ']');
		}

		m.edit({embed: {
			title: 'Success',
			description: 'Please select the players you want to put on the watchlist and then hit confirm:\n\n' + description.join('\n'),
			footer: {
				text: 'Alternatively you can send a message with "1,2,3.." to make a selection'
			},
			color: Discord.Util.resolveColor('#00ff00')
		}}).catch(() => {});

		var gotResponse = false;

		// Await message response
		m.channel.awaitMessages(reply => reply.author.id === msg.author.id, { max: 1, time: (5 * 60 * 1000) }).then(async (collected) => {
			if (gotResponse === true) return;
			gotResponse = true;

			if (!collected || !collected.first() || !collected.first().content || collected.first().content.length <= 0 || /* This looks like the shittiest regex ever */ !/^(\d?\s?(,+|\s+)\s?(\d)?)+$/.test(collected.first().content)) {
				await m.reactions.removeAll();

				m.edit({embed: {
					title: 'Error',
					description: 'No valid user input was given',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
				return;
			}

			if (collected.first().deletable && !collected.first().deleted) collected.first().delete();

			var selected = collected.first().content.split(/\s?(,+|\s+)\s?/g);
			var usersToAdd = [];

			for (let i in selected) {
				if (!/\d+/.test(selected[i])) continue;
				if (!res.matches[0].roundstats_legacy.reservation.account_ids[parseInt(selected[i]) - 1]) continue;
				usersToAdd.push(SteamID.fromIndividualAccountID(res.matches[0].roundstats_legacy.reservation.account_ids[parseInt(selected[i]) - 1]));
			}

			await m.reactions.removeAll();

			await m.edit({embed: {
				title: 'Please wait...',
				description: 'Adding ' + usersToAdd.length + ' user' + (usersToAdd.length === 1 ? '' : 's') + ' to watchlist',
				color: Discord.Util.resolveColor('#ff8000')
			}}).catch(() => {});

			addUsersToWatchlist(usersToAdd);
		}).catch((err) => {
			console.error(err);
		});

		// Await reactions response
		m.awaitReactions((r, u) => u.id === msg.author.id && [ client.config.emojis.checkmark, client.config.emojis.cross ].includes(r.emoji.id), { max: 1, time: (5 * 60 * 1000) }).then(async (collected) => {
			if (gotResponse === true) return;
			gotResponse = true;

			if (!collected || !collected.first()) {
				await m.reactions.removeAll();

				m.edit({embed: {
					title: 'Error',
					description: 'No valid user input was given',
					color: Discord.Util.resolveColor('#ff0000')
				}}).catch(() => {});
				return;
			}

			if (collected.first().emoji.id === client.config.emojis.cross) {
				await m.reactions.removeAll();

				m.edit({embed: {
					title: 'Success',
					description: 'Selection cancelled by user',
					color: Discord.Util.resolveColor('#00ff00')
				}}).catch(() => {});
				return;
			}

			m = await m.channel.messages.fetch(m.id); // Refetch the message to make sure we have all the reactions

			var usersToAdd = [];
			m.reactions.forEach(async (reaction) => {
				var num = parseInt(client.numbers[reaction.emoji.name]) - 1;
				if (isNaN(num)) return;
				if (!res.matches[0].roundstats_legacy.reservation.account_ids[num]) return;

				if (!reaction.users.get(msg.author.id)) return;
				usersToAdd.push(SteamID.fromIndividualAccountID(res.matches[0].roundstats_legacy.reservation.account_ids[num]));
			});

			await m.reactions.removeAll();

			await m.edit({embed: {
				title: 'Please wait...',
				description: 'Adding ' + usersToAdd.length + ' user' + (usersToAdd.length === 1 ? '' : 's') + ' to watchlist',
				color: Discord.Util.resolveColor('#ff8000')
			}}).catch(() => {});

			addUsersToWatchlist(usersToAdd);
		}).catch((err) => {
			console.error(err);
		});

		// Add emojis to our message
		for (let i in reactionsToAdd) {
			if (gotResponse === true) break;

			await m.react(reactionsToAdd[i]).then((r) => {
				if (gotResponse === true) r.users.remove();
			}).catch(() => {});
		}

		if (!gotResponse) await m.react(client.emojis.get(client.config.emojis.checkmark)).then((r) => {
			if (gotResponse === true) r.users.remove();
		}).catch(() => {});
		if (!gotResponse) await m.react(client.emojis.get(client.config.emojis.cross)).then((r) => {
			if (gotResponse === true) r.users.remove();
		}).catch(() => {});
	}

	// Listen to the "liveGameForUser" event from the CSGO GC
	client.csgoUser.on('liveGameForUser', handleLiveGame);

	// Function to add users
	async function addUsersToWatchlist(usersToAdd) {
		var success = [];
		var failed = [];
		var duplicate = [];

		for (let i in usersToAdd) {
			await new Promise((resolve, reject) => {
				client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
				request('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + usersToAdd[i].getSteamID64(), (err, res, body) => {
					if (err) {
						failed.push(usersToAdd[i]);
						console.error(err);
						resolve();
						return;
					}

					var banJson = undefined;
					try {
						banJson = JSON.parse(body);
					} catch(e) {};

					if (!banJson) {
						failed.push(usersToAdd[i]);
						console.log(body);
						resolve();
						return;
					}

					if (!banJson.players || banJson.players.length < 1) {
						failed.push(usersToAdd[i]);
						console.log(banJson);
						resolve();
						return;
					}

					client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
					request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + usersToAdd[i].getSteamID64(), async (err, res, body) => {
						if (err) {
							failed.push(usersToAdd[i]);
							console.error(err);
							resolve();
							return;
						}

						var profileJson = undefined;
						try {
							profileJson = JSON.parse(body);
						} catch(e) {};

						if (!profileJson) {
							failed.push(usersToAdd[i]);
							console.log(body);
							resolve();
							return;
						}

						if (!profileJson.response) {
							failed.push(usersToAdd[i]);
							console.log(profileJson);
							resolve();
							return;
						}

						if (!profileJson.response.players || profileJson.response.players.length < 1) {
							failed.push(usersToAdd[i]);
							console.log(profileJson);
							resolve();
							return;
						}

						await client.accounts.fetch(profileJson.response.players[0].steamid);

						if (client.accounts.get(profileJson.response.players[0].steamid)) {
							var data = client.accounts.get(profileJson.response.players[0].steamid);

							if (data.channels.includes(msg.channel.id)) {
								duplicate.push(usersToAdd[i]);
								resolve();
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

						success.push(usersToAdd[i]);
						resolve();
					});
				});
			});
		}

		var description = [
			'Successfully added ' + success.length + ' user' + (success.length === 1 ? '' : 's') + '.',
			'Failed to add ' + failed.length + ' user' + (failed.length === 1 ? '' : 's') + '.',
			'Already watching ' + duplicate.length + ' user' + (duplicate.length === 1 ? '' : 's') + '.'
		];

		m.edit({embed: {
			title: 'Success',
			description: description.join('\n'),
			color: Discord.Util.resolveColor('#00ff00')
		}}).catch(() => {});
	}
};

exports.help = {
	name: 'match',
	description: 'Gets the current Matchmaking information for a defined user or yourself',
	usage: 'match',
	hidden: true
};
