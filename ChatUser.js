/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
	/** make chat: store connection-device, rooom */

	constructor(send, roomName) {
		this._send = send; // "send" function for this user
		this.room = Room.get(roomName); // room user will be in
		this.name = null; // becomes the username of the visitor

		console.log(`created chat in ${this.room.name}`);
	}

	/** send msgs to this client using underlying connection-send-function */

	send(data) {
		try {
			this._send(data);
		} catch {
			// If trying to send to a user fails, ignore it
		}
	}

	/** handle joining: add to room members, announce join */

	handleJoin(name) {
		this.name = name;
		this.room.join(this);
		this.room.broadcast({
			type: "note",
			text: `${this.name} joined "${this.room.name}".`,
		});
	}

	/** handle a chat: broadcast to room. */

	handleChat(text) {
		if (text === "/joke") {
			const data = {
				name: "joker",
				type: "chat",
				text: "you looked for a joke",
			};
			this.send(JSON.stringify(data));
		} else if (text === "/members") {
			const data = {
				name: "Server",
				type: "chat",
				text: [...this.room.members].map((mem) => mem.name),
			};
			this.send(JSON.stringify(data));
		} else if (text.startsWith("/priv")) {
			let username = text.match(/(?<=(\/priv\s)).*?(?=\s)/g)[0];
			let re = new RegExp(String.raw`^/priv ${username} `, "g");
			let message = text.split(re)[1];
			try {
				[...this.room.members]
					.find((mem) => mem.name === username)
					.send(
						JSON.stringify({
							name: this.name,
							type: "chat",
							text: message,
						})
					);
			} catch (err) {
				console.log(err);
			}
			// console.log(parts);
			// let [username, message] = text.split(" ", 3).slice(1);
			console.log(`${username}: ${message}`);
		} else {
			this.room.broadcast({
				name: this.name,
				type: "chat",
				text: text,
			});
		}
	}

	/** Handle messages from client:
	 *
	 * - {type: "join", name: username} : join
	 * - {type: "chat", text: msg }     : chat
	 */

	handleMessage(jsonData) {
		let msg = JSON.parse(jsonData);

		if (msg.type === "join") this.handleJoin(msg.name);
		else if (msg.type === "chat") this.handleChat(msg.text);
		else throw new Error(`bad message: ${msg.type}`);
	}

	/** Connection was closed: leave room, announce exit to others */

	handleClose() {
		this.room.leave(this);
		this.room.broadcast({
			type: "note",
			text: `${this.name} left ${this.room.name}.`,
		});
	}
}

module.exports = ChatUser;
