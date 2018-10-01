const Discord = require('discord.js');
const request = require('request');
const SteamTotp = require('steam-totp');
const SteamUser = require('steam-user');

module.exports = async (client) => {
	// Keep being logged into Steam and constantly play CSGO
	// TODO: Figure out what happens when Steam/CSGO GC goes down and see if the bot automatically reconnects to the GC
	var logonSettings = {
		accountName: client.config.account.username,
		password: client.config.account.password
	};
	
	if (client.config.account.sharedSecret && client.config.account.sharedSecret.length > 5) {
		logonSettings.authCode = SteamTotp.getAuthCode(client.config.account.sharedSecret);
	}

	client.steamUser.logOn(logonSettings);

	client.steamUser.on('loggedOn', (details) => {
		client.steamUser.setPersona(SteamUser.Steam.EPersonaState.Online);
		client.steamUser.gamesPlayed([730]);
		client.csgoUser.start();
	});

	client.steamUser.on('error', (err) => {
		console.error(err);
	});

	client.steamUser.on('friendRelationship', async (sid, relationship) => {
		if (relationship === SteamUser.Steam.EFriendRelationship.RequestRecipient) {
			await client.premium.fetchEverything().catch(() => {});

			if (client.premium.array().includes(sid.getSteamID64())) {
				// Accept friend request
				client.steamUser.addFriend(sid);
			} else {
				// Ignore friend request
				client.steamUser.removeFriend(sid);
			}
		}
	});

	// Ban checking
	async function checkBans() {
		await client.accounts.fetchEverything();
		var accounts = client.accounts.array();

		var steamIDs = [];
		var ary = [];
		var counter = 0;
		for (let i = 0; i < accounts.length; i++) {
			ary.push(accounts[i].steamID);
			counter++;

			if (counter >= client.config.accountsPerRequest) {
				steamIDs.push(ary);
				counter = 0;
				ary = [];
			}
		}
		if (ary.length >= 1) steamIDs.push(ary);

		var i = -1;
		function loopSteamIds() {
			if (client.status !== 0) {
				setTimeout(checkBans, 180000); // Wait 3 minutes if Discord is having a struggle
				return;
			}

			i = i + 1;

			if (i >= steamIDs.length) {
				// Done checking steam IDs
				setTimeout(checkBans, 180000);
				return;
			}

			client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
			request('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamIDs[i].join(','), (err, res, body) => {
				if (err) {
					console.error(err);
					setTimeout(checkBans, 180000);
					return;
				}

				var json = undefined;
				try {
					json = JSON.parse(body);
				} catch(e) {};

				if (!json) {
					if (body.includes('Failed to load credentials')) console.log(client.steamAPI.keys, true);
					else console.log(body);
					setTimeout(checkBans, 180000);
					return;
				}

				if (!json.players || json.players.length < 1) {
					if (!json.players) {
						console.log(json); // Steam might have given us an error or something
						setTimeout(checkBans, 180000);
						return;
					} else {
						setTimeout(checkBans, 180000);
						return; // Players array is empty
					}
				}

				var i2 = -1;
				function checkUser() {
					i2 = i2 + 1;

					if (i2 >= json.players.length) {
						// Done checking users for this request
						loopSteamIds(); // Continue with the next request
						return;
					}

					for (let i3 = 0; i3 < steamIDs[i].length; i3++) {
						var steamid = steamIDs[i][i3].split('.')[0];

						if (json.players[i2].SteamId === steamid) {
							userBanDetails(steamid, json.players[i2]);
							return;
						}
					}

					async function userBanDetails(steamid, banJson) {
						/*
						0 = nothing
						1 = new vac
						2 = new game

						3 = new vac & game

						4 = new economy
						5 = new economy & vac
						6 = new economy & game
						7 = new economy & vac & game

						8 = new community
						9 = new community & vac
						10 = new community & game
						11 = new community & vac & game
						12 = new community & economy
						13 = new community & economy & vac
						14 = new community & economy & game
						15 = new community & economy & vac & game
						*/

						let bits = 0;

						await client.accounts.fetchEverything();
						const oldData = client.accounts.get(steamid);
						if (oldData.history.vacBans !== banJson.NumberOfVACBans) bits = bits + 1;
						if (oldData.history.gameBans !== banJson.NumberOfGameBans) bits = bits + 2;
						if (oldData.history.economyBans !== banJson.EconomyBan) bits = bits + 4;
						if (oldData.history.communityBan !== banJson.CommunityBanned) bits = bits + 8;

						if (bits > 0) {
							// Something about the user we are checking has changed

							client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
							request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, async (err, res, body) => {
								if (err) {
									console.error(err);
									checkUser();
									return;
								}

								var profileJson = undefined;
								try {
									profileJson = JSON.parse(body);
								} catch(e) {};

								if (!profileJson) {
									console.log(body);
									checkUser();
									return;
								}

								if (!profileJson.response || !profileJson.response.players || profileJson.response.players.length < 1) {
									if (!profileJson.response || !profileJson.response.players) {
										console.log(profileJson);
										checkUser();
										return;
									} else {
										checkUser();
										return; // Why would it ever be empty?! That doesnt make sense. It literally just passed during ban-check
									}
								}
								var profile = profileJson.response.players[0];

								const embed = new Discord.MessageEmbed();
								embed.setTimestamp();
								embed.setURL('https://steamcommunity.com/profiles/' + profile.steamid);
								embed.setColor('#990000');

								var description = [];
								description.push('The last name I have stored for this person was: `' + client.escapeEmojis(Discord.Util.escapeMarkdown(oldData.lastSavedName)) + '`');
								description.push('\n__**Exact change numbers:**__');
								description.push('	- ' + (((banJson.NumberOfVACBans - oldData.history.vacBans) >= 0) ? '+' : '') + (banJson.NumberOfVACBans - oldData.history.vacBans) + ' VAC Ban' + (([ -1, 1 ].includes(banJson.NumberOfVACBans - oldData.history.vacBans)) ? '' : 's'));
								description.push('	- ' + (((banJson.NumberOfGameBans - oldData.history.gameBans) >= 0) ? '+' : '') + (banJson.NumberOfGameBans - oldData.history.gameBans) + ' Game Ban' + (([ -1, 1 ].includes(banJson.NumberOfGameBans - oldData.history.gameBans)) ? '' : 's'));
								description.push('	- Old economy ban: ' + ((oldData.history.economyBans === 'none') ? '*none*' : oldData.history.economyBans) + ' | New economy ban: ' + ((banJson.EconomyBan === 'none') ? '*none*' : banJson.EconomyBan));
								description.push('	- ' + (((oldData.history.communityBan === false && banJson.CommunityBanned === true) === true) ? '+1' : (((oldData.history.communityBan === true && banJson.CommunityBanned === false) === true) ? '-1' : '+0')) + ' Community ban');
								description.push('\n**This accounts has been removed from my check-list due to the majority of the accounts never gonna be used again**');
								embed.setDescription(description.join('\n'));

								embed.setFooter('Bans get checked every ~3 minutes. A bit more depending on the amount of SteamIDs to check');

								// TODO: Add remove-ban detection incase of a unban
								if (bits === 0) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') - This should not be sent');
								else if (bits === 1) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new VAC ban');
								else if (bits === 2) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Game ban');
								else if (bits === 3) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new VAC & Game ban');
								else if (bits === 4) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Economy ban');
								else if (bits === 5) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Economy & VAC ban');
								else if (bits === 6) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Economy & Game ban');
								else if (bits === 7) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Economy & VAC & Game ban');
								else if (bits === 8) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community ban');
								else if (bits === 9) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & VAC ban');
								else if (bits === 10) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & Game ban');
								else if (bits === 11) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & VAC & Game ban');
								else if (bits === 12) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & Economy ban');
								else if (bits === 13) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & Economy & VAC ban');
								else if (bits === 14) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & Economy & Game ban');
								else if (bits === 15) embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') has a new Community & Economy & VAC & Game ban');
								else embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') - This should not be sent');

								await client.accounts.fetchEverything();

								if (!oldData.channels || oldData.channels.length < 1 || !client.accounts.get(steamid)) {
									// If you remove a user while I am checking it. I hate you, I just wasted a whole request on him
									checkUser();
									return;
								}

								oldData.channels.forEach((channelID) => {
									if (client.channels.get(channelID)) client.channels.get(channelID).send({embed: embed}).catch((e) => console.error(e));
								});

								// The majority of the accounts will never be used again. Its wasted storage so just delete the file
								if (client.accounts.get(steamid)) client.accounts.delete(steamid);

								checkUser();
							});
						} else {
							checkUser();
						}
					}
				}
				checkUser();
			});
		}
		loopSteamIds();
	};
	checkBans();
};
