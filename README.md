# Discord-Steam-Ban-Notifier

Add people to a watchlist and have them automatically be checked for a new ban around every 3 minutes (A bit more depending on the amount of users to check & how long it takes to send one API request).
[Invite the bot](https://discordapp.com/oauth2/authorize?client_id=471050678794715136&permissions=19456&scope=bot) (No 100% uptime guarantee)

# Config explanations
- `botToken`:
- - Type: String
- - Description: Obviously your Discord bot token from https://discordapp.com/developers/applications/
- `prefix`:
- - Type: String
- - Description: The prefix of your bot
- `admins`:
- - Type: Array of strings
- - Description: List of admins. Currently the only admin command is "reboot"
- `steamAPIkeys`:
- - Type: Array of strings
- - Description: List of valid Steam API keys. This won't be useful when the bot is very small but the more accounts the bot has to check the more useful this gets. Each API key is only used `switchKeyAt` (see below) amount of times. And then we switch to the next API key. When checking HUGE amounts of users this becomes VERY useful to go around API spam prevention. Steam allows 100,000 API requests per day without any ratelimit (No ratelimit documented in the Terms of Service)
- `switchKeyAt`:
- - Type: Integer
- - Description: How often to use 1 API key before switching to the next one
- `accountsPerRequest`:
- - Type: Integer
- - Description: The amount of accounts we use per request. Steam allows us to use multiple accounts in a single API request. To my knowledge the limit is ~1000. You can test it out yourself. Just chain your own ID a bunch of times and seperate it by a comma.
- `logs`
- - Type: String
- - Description: Discord channel ID where to log bot information. All console logs, warns & errors will be logged in there
- `emojis`
- - Type: Object
- - Description: The Emoji ID for the `checkmark` and `cross` key
- `activities`
- - Type: Array of objects
- - Description: List of activities to display on the bot. Follow the example
- `activitiesSwitchDelay`
- - Type: Integer
- - Description: Amount of milliseconds to wait before switching between activities
- `maintenance`
- - Type: Boolean
- - Description: Enables maintenance mode and only allows the owner to interact with the bot

### Config example:

Note: The owner ID will automatically get added to a "owner" key and will also automatically get added to the "admins" list.

```
{
	"botToken": "NDg2MjI5OTY2MjkyNTE2ODY0.Dm8Eew.Qt0BVcqSI8ypGzewF3TakpE23d",
	"prefix": "sb!",
	"admins": [],
	"steamAPIkeys": [
		"295AA368F6571D5381Z860SS41D857C0",
		"D041212AS8FEFED49EFF21DE00EASFI3"
	],
	"switchKeyAt": 50000,
	"accountsPerRequest": 500,
	"logs": "471135120347234315",
	"emojis": {
		"checkmark": "484008172273664030",
		"cross": "484008260211441664"
	},
	"activities": [
		{
			"type": "WATCHING",
			"value": "for steam bans"
		},
		{
			"type": "LISTENING",
			"value": "{prefix}"
		}
	],
	"activitiesSwitchDelay": 300000,
	"maintenance": false
}
```

*Those are fake keys, don't even try.
