module.exports = [

	function list_new_config_field (context, props) {

		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		// write your script in here

        if(props.config.list === undefined) {
            props.config.list = '1'
            result.updatedConfig = props.config
        }

		return result
	},

	// more will be added here later
]