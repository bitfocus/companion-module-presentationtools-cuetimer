export const UpgradeScripts = [
	function list_new_config_field(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		// write your script in here

		if (props.config !== null && props.config.list === undefined) {
			props.config.list = '1'
			result.updatedConfig = props.config
		}

		return result
	},

	// 3.0: Socket.IO on the LAN port replaces the TCP protocol; Cloud mode and a connection name were added
	function tcp_to_socket_io(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config !== null && props.config.mode === undefined) {
			props.config.mode = 'app'
			props.config.host = props.config.host || '127.0.0.1'
			// The LAN port, never the old Companion TCP port: CueTimer refuses the two being equal
			props.config.port = '31609'
			props.config.list = props.config.list ?? ''
			props.config.listId = ''
			props.config.name = 'Companion'
			result.updatedConfig = props.config
		}

		return result
	},
]
