const SteamTotp = require('steam-totp');
const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	if (msg.author.id !== client.config.owner) return;

	if (args[0] && args[0].toLowerCase() === 'status') {
		msg.channel.send({
			embed: {
				title: 'Current connection status: ' + (client.steamUser.steamID == null ? 'Connected' : 'Disconnected'),
				color: Discord.Util.resolveColor(client.steamUser.steamID == null ? "#00AA00" : "#AA0000")
			}
		});
	} else {
		if (client.steamUser.steamID == null) { // Log in
			var logonSettings = {
				accountName: client.config.account.username,
				password: client.config.account.password
			};

			if (client.config.account.sharedSecret && client.config.account.sharedSecret.length > 5) {
				logonSettings.authCode = SteamTotp.getAuthCode(client.config.account.sharedSecret);
			}

			client.steamUser.logOn(logonSettings);

			msg.channel.send({
				embed: {
					title: 'Successfully sent login request',
					color: Discord.Util.resolveColor("#00AA00")
				}
			});
		} else { // Log out
			client.steamUser.logOff();
			client.steamUser.steamID = null;

			msg.channel.send({
				embed: {
					title: 'Successfully sent logout request',
					color: Discord.Util.resolveColor("#AA0000")
				}
			});
		}
	}
};

exports.help = {
	name: 'acc',
	description: 'Login or out of the defined Steam account',
	usage: 'acc',
	hidden: true
};
