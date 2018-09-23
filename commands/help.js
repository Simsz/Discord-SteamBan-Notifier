const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	var app = await client.fetchApplication().catch((e) => console.error(e));
	var inviteLink = await client.generateInvite([ 'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS' ]).catch((e) => console.error(e));

	const embed = new Discord.MessageEmbed();
	embed.setTimestamp();
	embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
	embed.setTitle('Help Information');
	embed.setDescription('This bot was created by ' + (app.owner ? app.owner.tag : '*Failed to fetch owner tag*') + '. Previously only available as a private version now this bot is public and also [available on Github](https://github.com/BeepFelix/discord-steamban-notifier).' + '\n' + String.fromCodePoint(0x200B));

	var howToUse = [];
	howToUse.push('• To add someone to the checker list write `' + client.config.prefix + 'add <SteamID64/ProfileLink>`');
	howToUse.push('• To remove someone from the checker list write `' + client.config.prefix + 'remove <SteamID64/ProfileLink>`');
	howToUse.push('• To see a list of all users who are currently being watched write `' + client.config.prefix + 'list`');
	howToUse.push('');
	howToUse.push('**All commands are per-channel**');
	howToUse.push('Eg: Add someone to the watchlist in #admin then the ban notification will also appear in that channel and the `list` command will only return the watch list of the current channel. If a channel is deleted its watchlist is deleted');
	embed.addField('How to use?', howToUse.join('\n') + '\n' + String.fromCodePoint(0x200B));

	var commands = []; // Maybe automate this in the future?
	commands.push('• `' + client.config.prefix + 'profile` - Display information about the profile of a steam user');
	commands.push('• `' + client.config.prefix + 'add` - Add a user to the watchlist');
	commands.push('• `' + client.config.prefix + 'remove` - Remove a user from the watchlist');
	commands.push('• `' + client.config.prefix + 'list` - List all users in this channel\'s watchlist');
	commands.push('• `' + client.config.prefix + 'stats` - Get some bot stats');
	commands.push('• `' + client.config.prefix + 'help` - Show this help');
	embed.addField('Command List', commands.join('\n') + '\n' + String.fromCodePoint(0x200B));

	embed.addField('Bot Invite Link', inviteLink + '\n' + String.fromCodePoint(0x200B));

	msg.channel.send({embed: embed}).catch((e) => console.error(e));
};

exports.help = {
	name: 'help',
	description: 'Show this help',
	usage: 'help [command]'
};
