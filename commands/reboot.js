const fs = require('fs');
const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	if (!client.config.admins.includes(msg.author.id)) return;

	const embed = new Discord.MessageEmbed();
	embed.setTimestamp();
	embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
	embed.setTitle('Rebooting...');

	const m = await msg.channel.send({embed: embed}).catch((e) => console.error(e));
	if (!m) return;

	var obj = { id: m.id, channel: m.channel.id }

	fs.writeFileSync('./reboot.json', JSON.stringify(obj, null, 4));
	process.exit(1);
};

exports.help = {
	name: 'reboot',
	description: 'Restarts the bot',
	usage: 'reboot'
};
