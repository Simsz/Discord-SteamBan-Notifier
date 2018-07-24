const fs = require('fs');

module.exports = async (client, channel) => {
	if (channel.type !== 'text') return;

	var files = fs.readdirSync('./data');
	for (let i = 0; i < files.length; i++) {
		var json = JSON.parse(fs.readFileSync('./data/' + files[i]));
		var index = json.channels.indexOf(channel.id);
		if (index >= 0) {
			json.channels.splice(index, 1);

			if (json.channels.length < 1) fs.unlinkSync('./data/' + files[i]);
			else fs.writeFileSync('./data/' + files[i], JSON.stringify(json, null, 4));
		}
	}
};
