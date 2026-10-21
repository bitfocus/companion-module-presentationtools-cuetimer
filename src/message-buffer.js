import { StringDecoder } from 'node:string_decoder'
import { TERMINATOR } from './utils.js'

/**
 * Accumulates raw socket chunks and yields complete `$`-terminated messages.
 * Uses a StringDecoder so a multibyte character split across two chunks decodes intact.
 */
export class MessageBuffer {
	constructor(delimiter = TERMINATOR) {
		this.delimiter = delimiter
		this.decoder = new StringDecoder('utf8')
		this.buffer = ''
	}

	push(chunk) {
		// decoder.write(), never decoder.end(): end() would flush a split character as U+FFFD
		this.buffer += Buffer.isBuffer(chunk) ? this.decoder.write(chunk) : String(chunk)
	}

	extractMessages() {
		const messages = []
		let index
		while ((index = this.buffer.indexOf(this.delimiter)) !== -1) {
			const message = this.buffer.slice(0, index)
			this.buffer = this.buffer.slice(index + this.delimiter.length)
			if (message.length > 0) messages.push(message)
		}
		return messages
	}
}
