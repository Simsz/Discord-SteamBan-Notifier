const Discord = require('discord.js');
const request = require('request');
const SteamID = require('steamid');
const moment = require('moment');
require('moment-duration-format');

exports.run = async (client, msg, args) => {
	if (!args[0]) {
		msg.channel.send({embed: {
			title: 'Error',
			description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
		return;
	}

	var m = await msg.channel.send('Getting user information... Please wait a couple of seconds.');

	client.steamParse64ID(args[0]).then((steamid) => {
		client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
		request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, (err, res, body) => {
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

			var profile = profileJson.response.players[0];

			client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
			request('https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamid=' + steamid + '&relationship=friend', (err, res, body) => {
				if (err) {
					m.edit({embed: {
						title: 'Error',
						description: 'Failed to contact Steam API',
						color: Discord.Util.resolveColor('#ff0000')
					}}).catch(() => {});
					console.error(err);
					return;
				}

				var friendsJson = undefined;
				try {
					friendsJson = JSON.parse(body);
				} catch(e) {};

				try {
					var friends = friendsJson.friendslist.friends;
				} catch(e) {
					var friends = {};
				}

				client.steamAPIkeyCheck(); // We are about to use the API - Increase counter by 1 and change api key if needed
				request('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=' + client.steamAPI.keys[client.steamAPI.currentlyUsedID] + '&steamids=' + steamid, async (err, res, body) => {
					if (err) {
						m.edit({embed: {
							title: 'Error',
							description: 'Failed to contact Steam API',
							color: Discord.Util.resolveColor('#ff0000')
						}}).catch(() => {});
						console.error(err);
						return;
					}

					var bansJson = undefined;
					try {
						bansJson = JSON.parse(body);
					} catch(e) {};

					if (!bansJson) {
						m.edit({embed: {
							title: 'Error',
							description: 'Malformed Steam API response',
							color: Discord.Util.resolveColor('#ff0000')
						}}).catch(() => {});
						console.log(body);
						return;
					}

					if (!bansJson.players || bansJson.players.length < 1) {
						m.edit({embed: {
							title: 'Error',
							description: 'Malformed Steam API response',
							color: Discord.Util.resolveColor('#ff0000')
						}}).catch(() => {});
						console.log(bansJson);
						return;
					}

					var bans = bansJson.players[0];
					var sid = new SteamID(profile.steamid);

					// We have all base information we need. Lets build the embed!
					const embed = new Discord.MessageEmbed();
					embed.setAuthor(msg.author.tag, msg.author.avatarURL(), msg.url);
					embed.setColor('#000000');
					embed.setFooter('Account creation date');
					embed.setThumbnail(profile.avatarfull || profile.avatarmedium || profile.avatar);
					embed.setTimestamp(new Date(profile.timecreated * 1000));
					embed.setTitle(client.escapeEmojis(Discord.Util.escapeMarkdown(profile.personaname)) + ' (' + sid.getSteamID64() + ')');
					embed.setURL('https://steamcommunity.com/profiles/' + sid.getSteamID64());

					// General Profile Information
					var description = [];
					description.push('__**Privacy Status:**__ ' + (profile.communityvisibilitystate === 3 ? 'Public' : 'Private'));
					if (profile.loccountrycode) description.push('__**Country:**__ ' + ':flag_' + profile.loccountrycode.toLowerCase() + ':');
					if (profile.profileurl && profile.profileurl.split('/id/').length >= 2) description.push('__**Vanity URL:**__ ' + Discord.Util.escapeMarkdown(profile.profileurl.split('/id/').pop().replace('/', '')));
					if (profile.realname) description.push('__**Real Name:**__ ' + client.escapeEmojis(Discord.Util.escapeMarkdown(profile.realname)));
					description.push(String.fromCodePoint(0x200B));
					embed.addField('General Profile Information', description.join('\n'));

					// SteamID Information
					var description = [];
					description.push('__**SteamID2 (Old format):**__ ' + sid.getSteam2RenderedID());
					description.push('__**SteamID2 (New format):**__ ' + sid.getSteam2RenderedID(true));
					description.push('__**SteamID3:**__ ' + sid.getSteam3RenderedID());
					description.push('__**SteamID64:**__ ' + sid.getSteamID64());
					description.push('__**AccountID:**__ ' + sid.accountid);
					description.push(String.fromCodePoint(0x200B));
					embed.addField('SteamID Information', description.join('\n'));

					// Friend Information
					if (Array.isArray(friends) && friends.length > 0) {
						friends.sort((a, b) => b.friend_since - a.friend_since);

						if (friends.length > 6) {
							var newestFriends = friends.slice(0, 3).reverse();
							var oldestFriends = friends.slice(friends.length - 3).reverse();

							var description = [];
							for (let i in oldestFriends) {
								var res = await client.getSteamProfile(oldestFriends[i].steamid);
								if (!res) description.push('__**([' + oldestFriends[i].steamid + '](https://steamcommunity.com/profiles/' + oldestFriends[i].steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(oldestFriends[i].friend_since * 1000).getTime()).format('D [days]'));
								else description.push('__**' + client.escapeEmojis(Discord.Util.escapeMarkdown(res.personaname)) + ' [' + res.steamid + '](https://steamcommunity.com/profiles/' + res.steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(oldestFriends[i].friend_since * 1000).getTime()).format('D [days]'));
							}
							description.push('');
							description.push('\\⏫ Oldest Friends \\⏫ \\⏬ Newest Friends \\⏬');
							description.push('');
							for (let i in newestFriends) {
								var res = await client.getSteamProfile(newestFriends[i].steamid).catch(() => {});
								if (!res) description.push('__**([' + newestFriends[i].steamid + '](https://steamcommunity.com/profiles/' + newestFriends[i].steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(newestFriends[i].friend_since * 1000).getTime()).format('D [days]'));
								else description.push('__**' + client.escapeEmojis(Discord.Util.escapeMarkdown(res.personaname)) + ' ([' + res.steamid + '](https://steamcommunity.com/profiles/' + res.steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(newestFriends[i].friend_since * 1000).getTime()).format('D [days]'));
							}
							description.push(String.fromCodePoint(0x200B));
						} else {
							friends.reverse();

							var description = [];
							for (let i in friends) {
								var res = await client.getSteamProfile(friends[i].steamid).catch(() => {});
								if (!res) description.push('__**([' + friends[i].steamid + '](https://steamcommunity.com/profiles/' + friends[i].steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(friends[i].friend_since * 1000).getTime()).format('D [days]'));
								else description.push('__**' + client.escapeEmojis(Discord.Util.escapeMarkdown(res.personaname)) + ' [' + res.steamid + '](https://steamcommunity.com/profiles/' + res.steamid + ')):**__ ' + moment.duration(new Date().getTime() - new Date(friends[i].friend_since * 1000).getTime()).format('D [days]'));
							}
							description.push(String.fromCodePoint(0x200B));
						}
						embed.addField('Friend Information (' + friends.length + ')', description.join('\n'));
					}

					// Ban information
					var description = [];
					description.push('__**Community Banned:**__ ' + (!bans.CommunityBanned ? client.emojis.get(client.config.emojis.cross).toString() : client.emojis.get(client.config.emojis.checkmark).toString()));
					description.push('__**VAC Banned:**__ ' + (bans.NumberOfVACBans <= 0 ? client.emojis.get(client.config.emojis.cross).toString() : (bans.NumberOfVACBans + ' VAC ban' + (bans.NumberOfVACBans === 1 ? '' : 's'))));
					description.push('__**Game Banned:**__ ' + (bans.NumberOfGameBans <= 0 ? client.emojis.get(client.config.emojis.cross).toString() : (bans.NumberOfGameBans + ' Game ban' + (bans.NumberOfGameBans === 1 ? '' : 's'))));
					if (bans.NumberOfGameBans >= 1 || bans.NumberOfVACBans >= 1) description.push('__**Last Ban:**__ ' + bans.DaysSinceLastBan + ' day' + (bans.DaysSinceLastBan === 1 ? '' : 's') + ' ago');
					description.push('__**Economy Banned:**__ ' + (bans.EconomyBan === 'none' ? client.emojis.get(client.config.emojis.cross).toString() : client.emojis.get(client.config.emojis.checkmark).toString()));
					description.push(String.fromCodePoint(0x200B));
					embed.addField('Ban Information', description.join('\n'));

					m.edit('', { embed: embed });
				});
			});
		});
	}).catch((err) => {
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
};

exports.help = {
	name: 'profile',
	description: 'Get profile information of a steam user',
	usage: 'profile <SteamID/ProfileLink>'
};
