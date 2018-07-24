const fs = require('fs');

exports.run = async (client, msg, args) => {
	if (!args[0]) {
		msg.channel.send('*Template:* Usage: `' + this.help.usage + '`').catch(() => {});
		return;
	}

	var m = await msg.channel.send('*Template:* Please wait...').catch(() => {});
	if (!m) return;

	client.steamParse64ID(args[0]).then((steamid) => {
		var files = fs.readdirSync('./data');
		var found = false;
		for (let i = 0; i < files.length; i++) {
			var json = JSON.parse(fs.readFileSync('./data/' + files[i]));
			var index = json.channels.indexOf(msg.channel.id);
			if (index >= 0) {
				found = true;
				json.channels.splice(index, 1);

				if (json.channels.length < 1) fs.unlinkSync('./data/' + files[i]);
				else fs.writeFileSync('./data/' + files[i], JSON.stringify(json, null, 4));

				m.edit('*Template:* Successfully removed ' + steamid + ' from watch list').catch(() => {});
				break;
			}
		}
		if (!found) m.edit('*Template:* ' + steamid + ' is not being watched').catch(() => {});
	}).catch((err) => {
		if (typeof err === 'string') {
			if (err === 'Malformed Steam API Response') {
				m.edit('*Template:* ' + err).catch(() => {});
			} else if (err === 'No match') {
				m.edit('*Template:* Could not get SteamID64').catch(() => {});
			} else {
				console.log(err);
				m.edit('*Template:* Unknown Steam Response').catch(() => {});
			}
		} else {
			console.error(err);
			m.edit('*Template:* Unknown Steam Response').catch(() => {});
		}
	});
};

exports.help = {
	name: 'remove',
	description: 'Remove a user from the watch list',
	usage: 'remove <SteamID64/ProfileLink>'
};
