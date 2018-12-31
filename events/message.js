const Discord = require('discord.js');

module.exports = async (client, message) => {
	if (!message.guild) return;

	if (message.content.match(new RegExp('^<@!?' + client.user.id + '>$'))) {
		message.channel.send('My prefix is: `' + client.config.prefix + '`');
		return;
	}

	if (message.content.indexOf(client.config.prefix) !== 0) return;

	if (client.config.maintenance === true && !client.config.admins.includes(message.author.id)) {
		message.channel.send('Currently in maintenance mode.');
		return;
	}

	const args = message.content.split(/ +/g);
	const command = args.shift().slice(client.config.prefix.length).toLowerCase();

	if (!client.commands.get(command)) return;

	const cmd = client.commands.get(command);
	if (cmd) {
		cmd.run(client, message, args).catch((err) => {
			console.error(err);

			message.channel.send({
				embed: {
					title: 'You have caused an error!',
					description: 'Apologies! Information has been logged and I will get onto fixing it as fast as I can!',
					color: Discord.Util.resolveColor('#00AA00')
				}
			}).catch(() => {});
		});
	}
};
