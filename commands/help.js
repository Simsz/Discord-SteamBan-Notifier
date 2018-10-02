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
	howToUse.push('• To add someone to the checker list write `' + client.config.prefix + client.commands.get('add').help.usage + '`');
	howToUse.push('• To remove someone from the checker list write `' + client.config.prefix + client.commands.get('remove').help.usage + '`');
	howToUse.push('• To see a list of all users who are currently being watched write `' + client.config.prefix + 'list`');
	howToUse.push('• **Premium Only** command `' + client.config.prefix + 'match` allows you to list your current CSGO Matchmaking game and easily add users to the watchlist through an interface');
	howToUse.push('');
	howToUse.push('**All commands are per-channel**');
	howToUse.push('Eg: Add someone to the watchlist in #admin then the ban notification will also appear in that channel and the `list` command will only return the watchlist of the current channel. If a channel is deleted its watchlist is deleted');
	embed.addField('How to use?', howToUse.join('\n') + '\n' + String.fromCodePoint(0x200B));

	var commands = [];
	client.commands.forEach((command) => {
		if (command.help.hidden === true) return;
		commands.push('• `' + client.config.prefix + command.help.name + '` - ' + command.help.description);
	});
	embed.addField('Command List', commands.join('\n') + '\n' + String.fromCodePoint(0x200B));

	embed.addField('Bot Invite Link', inviteLink + '\n' + String.fromCodePoint(0x200B));

	msg.channel.send({embed: embed}).catch((e) => console.error(e));
};

exports.help = {
	name: 'help',
	description: 'Show this help',
	usage: 'help [command]'
};
