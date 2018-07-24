const Discord = require('discord.js');
const request = require('request');
const fs = require('fs');

module.exports = async (client) => {
	function checkBans() {
		if (!fs.existsSync('./data')) {
			setTimeout(checkBans, 300000); // If the folder doesn't exist wait 5 minutes
			return;
		}

		fs.readdir('./data', (err, files) => {
			if (err) {
				setTimeout(checkBans, 180000);
				console.error(err);
				return;
			}

			var steamIDs = [];
			var ary = [];
			var counter = 0;
			for (let i = 0; i < files.length; i++) {
				ary.push(files[i]);
				counter++;

				if (counter >= client.config.accountsPerRequest) {
					steamIDs.push(ary);
					counter = 0;
				}
			}
			if (ary.length >= 1) steamIDs.push(ary);

			var i = -1;
			function loopSteamIds() {
				if (client.status !== 0) {
					setTimeout(checkBans, 180000); // Wait 1 minute if Discord is having a struggle
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
						setTimeout(checkBans, 180000)
						return;
					}

					var json = undefined;
					try {
						json = JSON.parse(body);
					} catch(e) {};
					
					if (!json) {
						console.log(body);
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

						function userBanDetails(steamid, banJson) {
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

							const oldData = JSON.parse(fs.readFileSync('./data/' + steamid + '.json'));
							if (oldData.history.vacBans !== banJson.NumberOfVACBans) bits = bits + 1;
							if (oldData.history.gameBans !== banJson.NumberOfGameBans) bits = bits + 2;
							if (oldData.history.economyBans !== banJson.EconomyBan) bits = bits + 4;
							if (oldData.history.communityBan !== banJson.CommunityBanned) bits = bits + 8;

							if (bits > 0) {
								// Something about the user we are checking has changed

								client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
								request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, (err, res, body) => {
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
									embed.setDescription('The last name I have stored for this person was: `' + Discord.Util.escapeMarkdown(oldData.lastSavedName) + '`\n\n**This accounts has been removed from my check-list due to the majority of the accounts never gonna be used again**');
									embed.setFooter('Bans get checked every ~3 minutes. A bit more depending on the amount of SteamIDs to check');

									// TODO: Add remove-ban detection incase of a unban
									if (bits === 0) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') - This should not be sent');
									else if (bits === 1) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new VAC ban');
									else if (bits === 2) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Game ban');
									else if (bits === 3) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new VAC & Game ban');
									else if (bits === 4) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Economy ban');
									else if (bits === 5) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Economy & VAC ban');
									else if (bits === 6) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Economy & Game ban');
									else if (bits === 7) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Economy & VAC & Game ban');
									else if (bits === 8) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community ban');
									else if (bits === 9) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & VAC ban');
									else if (bits === 10) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & Game ban');
									else if (bits === 11) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & VAC & Game ban');
									else if (bits === 12) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & Economy ban');
									else if (bits === 13) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & Economy & VAC ban');
									else if (bits === 14) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & Economy & Game ban');
									else if (bits === 15) embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') has a new Community & Economy & VAC & Game ban');
									else embed.setTitle(Discord.Util.escapeMarkdown(profile.personaname) + ' (' + profile.steamid + ') - This should not be sent');

									if (!oldData.channels || oldData.channels.length < 1 || !fs.existsSync('./data/' + steamid + '.json')) {
										// If you remove a user while I am checking it. I hate you, I just wasted a whole request on him
										if (fs.existsSync('./data/' + steamid + '.json')) fs.unlinkSync('./data/' + steamid + '.json');

										checkUser();
										return;
									}

									oldData.channels.forEach((channelID) => {
										if (client.channels.get(channelID)) client.channels.get(channelID).send({embed: embed}).catch((e) => console.error(e));
									});

									// The majority of the accounts will never be used again. Its wasted storage so just delete the file
									if (fs.existsSync('./data/' + steamid + '.json')) fs.unlinkSync('./data/' + steamid + '.json');

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
		});
	};
	checkBans();
};
