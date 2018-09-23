const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	if (msg.author.id !== client.config.owner) return;

	const embed = new Discord.MessageEmbed();
	embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
	embed.setTimestamp();

	const startTime = new Date().getMilliseconds();

	const code = args.join(' ');
	var showCode = code.length > 1014 ? code.substring(0, 1014 - 3) + "..." : code;

	embed.addField('📥 Code to execute', '```js\n' + showCode + '```');

	try {
		const evaled = client.clean(await eval(code));

		const endTime = new Date().getMilliseconds() - startTime;
		embed.setFooter('Took ' + endTime + 'ms to execute');

		var showEvaled = evaled.length > 1014 ? evaled.substring(0, 1014 - 3) + "..." : evaled;

		embed.addField('📤 Successfully evaluated', '```js\n' + showEvaled + '```');

		msg.channel.send({embed: embed});
	}
	catch(err) {
		const endTime = new Date().getMilliseconds() - startTime;
		embed.setFooter('Took ' + endTime + 'ms to execute');

		err = client.clean(err);

		var showErr = err.length > 1014 ? err.substring(0, 1014 - 3) + "..." : err;

		embed.addField('📤 Failed to evaluate', '```js\n' + showErr + '```');

		msg.channel.send({embed: embed});
	}
};

exports.help = {
	name: 'eval',
	description: 'Evaluates arbitrary javascript',
	usage: 'eval <code>'
};
