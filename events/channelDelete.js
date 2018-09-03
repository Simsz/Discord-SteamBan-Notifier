module.exports = async (client, channel) => {
	if (channel.type !== 'text') return;

	var datas = await client.accounts.fetchEverything();
	datas.forEach((data) => {
		var index = data.channels.indexOf(channel.id);
		if (index >= 0) {
			data.channels.splice(index, 1);

			if (data.channels.length < 1) client.accounts.delete(data.steamID);
			else client.accounts.set(data.steamID, data);
		}
	});
};
