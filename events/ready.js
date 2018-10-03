const fs = require('fs');

module.exports = async client => {
	if (fs.existsSync('./reboot.json')) {
		const json = JSON.parse(fs.readFileSync('./reboot.json'));
		const m = await client.channels.get(json.channel).messages.fetch(json.id).catch((e) => {});
		if (!m) {
			fs.unlink('./reboot.json', ()=>{});
			return;
		};

		m.embeds[0].title = 'Rebooted!';
		var m2 = await m.edit({embed: m.embeds[0]});

		m.embeds[0].title = 'Rebooted! (took: `' + parseInt(m2.editedTimestamp - m2.createdTimestamp) + 'ms)`';
		await m2.edit({embed: m.embeds[0]});

		fs.unlink('./reboot.json', ()=>{});
	}
	console.log('Ready to spy on ' + client.users.size + ' users, in ' + client.channels.size + ' channels of ' + client.guilds.size + ' servers as ' + client.user.tag + '.');

	if (client.config.maintenance === true) {
		client.user.setActivity('MAINTENANCE', { type: 'WATCHING' });
	} else {
		var i = 0;
		function switchActivity() {
			if (client.status !== 0) return;

			i++;
			if (i >= client.config.activities.length) i = 0;

			var display = client.config.activities[i].value;
			display = display.replace(/{prefix}/g, client.config.prefix);

			client.user.setActivity(display, { type: client.config.activities[i].type });
		}
		client.setInterval(switchActivity, client.config.activitiesSwitchDelay);
		switchActivity();
	}
};
