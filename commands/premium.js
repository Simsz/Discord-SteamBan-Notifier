const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	if (client.config.owner !== msg.author.id) return;

	// TODO: Make this more easy to use instead of being forced to use their IDs

	// This entire premium system only exists because I do not know if this is stable enough to be used by a bunch of people at once
	// Requires more testing and seeing what happens when Steam/the CSGO GC goes down

	if (!args[0]) {
		msg.channel.send({embed: {
			title: 'Error',
			description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
		return;
	}

	await client.premium.fetchEverything();

	if (args[0].toLowerCase() === 'add') {
		if (!args[1] || !args[2]) {
			msg.channel.send({embed: {
				title: 'Error',
				description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		if (client.premium.get(args[1])) {
			msg.channel.send({embed: {
				title: 'Error',
				description: 'User is already premium',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		client.premium.set(args[1], args[2]);

		msg.channel.send({embed: {
			title: 'Success',
			description: 'Successfully assigned ' + args[1] + ' premium and bound ' + args[2] + ' to their account.',
			color: Discord.Util.resolveColor('#00ff00')
		}}).catch(() => {});
	} else if (args[0].toLowerCase() === 'remove') {
		if (!args[1]) {
			msg.channel.send({embed: {
				title: 'Error',
				description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		if (!client.premium.get(args[1])) {
			msg.channel.send({embed: {
				title: 'Error',
				description: 'User is not premium',
				color: Discord.Util.resolveColor('#ff0000')
			}}).catch(() => {});
			return;
		}

		client.premium.delete(args[1]);

		msg.channel.send({embed: {
			title: 'Success',
			description: 'Successfully removed ' + args[1] + '\'s premium.',
			color: Discord.Util.resolveColor('#00ff00')
		}}).catch(() => {});
	} else if (args[0].toLowerCase() === 'list') {
		var list = [];
		client.premium.map((val, key) => {
			list.push(key + ': ' + val);
		});

		// Non-embed but easiest way to send a potentially big message
		msg.channel.send(list.join('\n'), { split: true, code: true }).catch(() => {});
	} else {
		msg.channel.send({embed: {
			title: 'Error',
			description: 'Usage: `' + client.config.prefix + this.help.usage + '`',
			color: Discord.Util.resolveColor('#ff0000')
		}}).catch(() => {});
	}
};

exports.help = {
	name: 'premium',
	description: 'Add/Remove a user to/from the premium list',
	usage: 'premium <add/remove/list> [DiscordID] [SteamID64]',
	hidden: true
};
