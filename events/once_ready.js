const Discord = require('discord.js');
const request = require('request');
const SteamTotp = require('steam-totp');
const SteamUser = require('steam-user');

module.exports = async (client) => {
	// Maintain a CSGO GameCoordinator connection
	var logonSettings = {
		accountName: client.config.account.username,
		password: client.config.account.password
	};

	if (client.config.account.sharedSecret && client.config.account.sharedSecret.length > 5) {
		logonSettings.authCode = SteamTotp.getAuthCode(client.config.account.sharedSecret);
	}

	client.steamUser.logOn(logonSettings);

	client.steamUser.on('loggedOn', () => {
		client.steamUser.setPersona(SteamUser.Steam.EPersonaState.Online);
		client.steamUser.gamesPlayed([730]);
		client.csgoUser.start();
	});

	client.steamUser.on('error', (err) => {
		console.error(err);

		if (client.csgoUser._GCHelloInterval) {
			clearInterval(client.csgoUser._GCHelloInterval);
		}

		client.csgoUser._GCStatus = false;

		setTimeout(() => {
			client.steamUser.logOn(logonSettings);
		}, (30 * 1000)); // Try to log back in after 30 seconds incase our session is closed
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

			i++;

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
					console.log(body);
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
					i2++;

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

						 1 = VAC
						 2 = Game

						 3 = VAC & Game

						 4 = Economy
						 5 = Economy & VAC
						 6 = Economy & Game
						 7 = Economy & VAC & Game

						 8 = Community
						 9 = Community & VAC
						10 = Community & Game
						11 = Community & VAC & Game
						12 = Community & Economy
						13 = Community & Economy & VAC
						14 = Community & Economy & Game
						15 = Community & Economy & VAC & Game
						*/

						let bits = 0;

						await client.accounts.fetchEverything();
						const oldData = client.accounts.get(steamid);
						if (oldData.history.vacBans !== banJson.NumberOfVACBans) bits += 1;
						if (oldData.history.gameBans !== banJson.NumberOfGameBans) bits += 2;
						if (oldData.history.economyBans !== banJson.EconomyBan) bits += 4;
						if (oldData.history.communityBan !== banJson.CommunityBanned) bits += 8;

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

								embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + profile.steamid + ') ');

								if (bits === 0) embed.title += '- This should not be sent';
								else if (bits === 1) embed.title += 'VAC ban status changed';
								else if (bits === 2) embed.title += 'Game ban status changed';
								else if (bits === 3) embed.title += 'VAC & Game ban status changed';
								else if (bits === 4) embed.title += 'Economy ban status changed';
								else if (bits === 5) embed.title += 'Economy & VAC ban status changed';
								else if (bits === 6) embed.title += 'Economy & Game ban status changed';
								else if (bits === 7) embed.title += 'Economy & VAC & Game ban status changed';
								else if (bits === 8) embed.title += 'Community ban status changed';
								else if (bits === 9) embed.title += 'Community & VAC ban status changed';
								else if (bits === 10) embed.title += 'Community & Game ban status changed';
								else if (bits === 11) embed.title += 'Community & VAC & Game ban status changed';
								else if (bits === 12) embed.title += 'Community & Economy ban status changed';
								else if (bits === 13) embed.title += 'Community & Economy & VAC ban status changed';
								else if (bits === 14) embed.title += 'Community & Economy & Game ban status changed';
								else if (bits === 15) embed.title += 'Community & Economy & VAC & Game ban status changed';
								else embed.title += '- This should not be sent';

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
