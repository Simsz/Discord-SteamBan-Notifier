const Discord = require('discord.js');

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

	client.steamParse64ID(args[0]).then(async (steamid) => {
		await client.accounts.fetch(steamid);
		if (!client.accounts.get(steamid)) {
			m.edit({embed: {
				title: 'Error',
				description: '`' + steamid + '` is not being watched',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		var data = client.accounts.get(steamid);
		var index = data.channels.indexOf(msg.channel.id);
		if (index >= 0) {
			data.channels.splice(index, 1);

			if (data.channels.length < 1) client.accounts.delete(steamid);
			else client.accounts.set(steamid, data);

			m.edit({embed: {
				title: 'Success',
				description: 'Removed `' + steamid + '` from the watchlist',
				color: Discord.Util.resolveColor('#00ff00')
			}}).catch(() => {});
		} else {
			// Should never happen
			m.edit({embed: {
				title: 'Error',
				description: '`' + steamid + '` is not being watched',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}
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
	name: 'remove',
	description: 'Remove a user from the watchlist',
	usage: 'remove <SteamID64/ProfileLink>'
};
